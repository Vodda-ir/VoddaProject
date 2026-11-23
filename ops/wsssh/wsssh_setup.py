#!/usr/bin/env python3
# نصاب یکپارچهٔ تونل SSH-over-WS روی سرور (از طریق کنسول VNC اجرا می‌شود):
#   curl -sL <gist-raw-url> | python3 - <TOKEN>
# گام‌ها: نوشتن پل → systemd → پچ nginx → nginx -t/reload → بازگردانی Port 22 → خودآزمایی
import os
import re
import socket
import subprocess
import sys
import time

BRIDGE_SOURCE = r'''#!/usr/bin/env python3
# پل WebSocket→TCP سمت سرور — فقط کتابخانهٔ استاندارد
# استفاده: python3 wsssh_server.py <bind> <ws_port> <target_host> <target_port> <allowed_path>
# هر اتصال WebSocket باینری به یک اتصال TCP به مقصد پل می‌شود (برای تونل SSH).
# طراحی: هندشیک بلوک‌کننده → دو رشته (هر جهت یکی) + قفل ارسال روی سوکت WS
import base64
import hashlib
import os
import socket
import struct
import sys
import threading
import time

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
OP_CONT, OP_TEXT, OP_BIN, OP_CLOSE, OP_PING, OP_PONG = 0x0, 0x1, 0x2, 0x8, 0x9, 0xA
MAX_FRAME = 8 << 20
READ_TIMEOUT = 120  # ثانیه؛ هر جهتی این‌قدر سکوت کند = تونل مُرده


def log(msg: str) -> None:
    sys.stderr.write(f"[wsssh {time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}\n")
    sys.stderr.flush()


def mask_bytes(data: bytes, key: bytes) -> bytes:
    if not data:
        return data
    ext = (key * (len(data) // 4 + 1))[: len(data)]
    return (int.from_bytes(data, "big") ^ int.from_bytes(ext, "big")).to_bytes(len(data), "big")


def encode_frame(opcode: int, payload: bytes, mask: bool = False) -> bytes:
    b0 = 0x80 | opcode
    n = len(payload)
    if n < 126:
        header = struct.pack("!BB", b0, (0x80 if mask else 0) | n)
    elif n < 65536:
        header = struct.pack("!BBH", b0, (0x80 if mask else 0) | 126, n)
    else:
        header = struct.pack("!BBQ", b0, (0x80 if mask else 0) | 127, n)
    if not mask:
        return header + payload
    key = os.urandom(4)
    return header + key + mask_bytes(payload, key)


class FrameReader:
    """خوانش فریم WS روی سوکت بلوک‌کننده — بدون گم‌شدن بایت."""

    def __init__(self, sock: socket.socket, leftover: bytes = b""):
        self.sock = sock
        self.buf = bytearray(leftover)

    def _need(self, n: int) -> bytes:
        while len(self.buf) < n:
            chunk = self.sock.recv(65536)
            if not chunk:
                raise ConnectionError("closed")
            self.buf.extend(chunk)
        out = bytes(self.buf[:n])
        del self.buf[:n]
        return out

    def frame(self):
        fragments = []
        frag_op = None
        while True:
            head = self._need(2)
            b1, b2 = head[0], head[1]
            opcode = b1 & 0x0F
            fin = bool(b1 & 0x80)
            masked = bool(b2 & 0x80)
            n = b2 & 0x7F
            if n == 126:
                n = struct.unpack("!H", self._need(2))[0]
            elif n == 127:
                n = struct.unpack("!Q", self._need(8))[0]
            if n > MAX_FRAME:
                raise ConnectionError(f"frame too large: {n}")
            key = self._need(4) if masked else b""
            payload = self._need(n) if n else b""
            if masked and payload:
                payload = mask_bytes(payload, key)
            if opcode in (OP_CLOSE, OP_PING, OP_PONG):
                return opcode, payload
            if opcode in (OP_TEXT, OP_BIN):
                if fin:
                    return opcode, payload
                frag_op = opcode
                fragments = [payload]
            elif opcode == OP_CONT:
                fragments.append(payload)
                if fin:
                    return frag_op or OP_BIN, b"".join(fragments)


def read_http_request(sock: socket.socket) -> tuple[str, dict[str, str]]:
    sock.settimeout(10)
    data = bytearray()
    while b"\r\n\r\n" not in data:
        chunk = sock.recv(4096)
        if not chunk:
            raise ConnectionError("client closed before request")
        data.extend(chunk)
        if len(data) > 32768:
            raise ValueError("request too large")
    head, _, rest = bytes(data).partition(b"\r\n\r\n")
    lines = head.decode("latin-1").split("\r\n")
    request_line = lines[0] if lines else ""
    headers: dict[str, str] = {}
    for line in lines[1:]:
        name, _, value = line.partition(":")
        headers[name.strip().lower()] = value.strip()
    return request_line, headers


def handle(conn: socket.socket, addr, target_host: str, target_port: int, allowed_path: str) -> None:
    peer = f"{addr[0]}:{addr[1]}"
    tcp = None
    try:
        try:
            request_line, headers = read_http_request(conn)
        except (ConnectionError, ValueError, socket.timeout) as exc:
            log(f"handshake-read failed from {peer}: {exc}")
            return
        parts = request_line.split(" ")
        path = parts[1] if len(parts) >= 2 else ""
        if path != allowed_path:
            log(f"403 {peer} bad path ({path[:64]})")
            try:
                conn.sendall(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
            except OSError:
                pass
            return
        if "websocket" not in headers.get("upgrade", "").lower() or "sec-websocket-key" not in headers:
            log(f"400 {peer} not a websocket upgrade")
            try:
                conn.sendall(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
            except OSError:
                pass
            return
        key = headers["sec-websocket-key"]
        accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
        conn.sendall(
            (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode()
        )
        tcp = socket.create_connection((target_host, target_port), timeout=10)
        tcp.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        log(f"tunnel opened {peer} -> {target_host}:{target_port}")
    except OSError as exc:
        log(f"tunnel setup failed {peer}: {exc}")
        try:
            conn.close()
        except OSError:
            pass
        return

    conn.settimeout(READ_TIMEOUT)
    tcp.settimeout(READ_TIMEOUT)
    send_lock = threading.Lock()
    done = [False]  # True یعنی کلاینت EOF ورودی خودش را اعلام کرده (نیم‌بستار)

    def ws_send(opcode: int, payload: bytes) -> None:
        with send_lock:
            conn.sendall(encode_frame(opcode, payload))

    def ws_to_tcp() -> None:
        reader = FrameReader(conn)
        try:
            while True:
                opcode, payload = reader.frame()
                if opcode == OP_CLOSE:
                    break
                if opcode == OP_PING:
                    if payload.startswith(b"wssh-eof"):
                        done[0] = True
                        return
                    ws_send(OP_PONG, payload)
                    continue
                if opcode == OP_PONG:
                    continue
                if payload and opcode in (OP_BIN, OP_TEXT, OP_CONT):
                    tcp.sendall(payload)
        except (OSError, ConnectionError):
            pass

    def tcp_to_ws() -> None:
        try:
            while True:
                # پس از اعلام EOF کلاینت، سکوت طولانی خروجی sshd مجاز است
                tcp.settimeout(3600 if done[0] else READ_TIMEOUT)
                data = tcp.recv(131072)
                if not data:
                    break
                ws_send(OP_BIN, data)
        except (OSError, ConnectionError):
            pass

    t1 = threading.Thread(target=ws_to_tcp, daemon=True)
    t2 = threading.Thread(target=tcp_to_ws, daemon=True)
    t1.start()
    t2.start()
    t1.join()
    if not done[0]:
        # بستن ناقص/خطا از سمت کلاینت — تخریب فوری
        try:
            tcp.close()
        except OSError:
            pass
    t2.join(timeout=3700)
    try:
        ws_send(OP_CLOSE, b"")
    except OSError:
        pass
    for s in (conn, tcp):
        try:
            s.close()
        except OSError:
            pass
    log(f"tunnel closed {peer}")


def main() -> None:
    if len(sys.argv) < 6:
        print("usage: wsssh_server.py <bind> <ws_port> <target_host> <target_port> <allowed_path>", file=sys.stderr)
        sys.exit(2)
    bind_addr, ws_port_s, target_host, target_port_s, allowed_path = sys.argv[1:6]
    ws_port = int(ws_port_s)
    target_port = int(target_port_s)
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((bind_addr, ws_port))
    srv.listen(16)
    log(f"listening on {bind_addr}:{ws_port} path={allowed_path} target={target_host}:{target_port}")
    while True:
        conn, addr = srv.accept()
        t = threading.Thread(
            target=handle,
            args=(conn, addr, target_host, target_port, allowed_path),
            daemon=True,
        )
        t.start()


if __name__ == "__main__":
    main()'''


def sh(cmd: str) -> tuple[int, str, str]:
    p = subprocess.run(["bash", "-lc", cmd], capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def fail(step: str, err: str = "") -> None:
    print(f"FAIL_{step}: {err[:400]}")
    sys.exit(1)


def wait_port(port: int, timeout: float = 15.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            s = socket.create_connection(("127.0.0.1", port), timeout=2)
            s.close()
            return True
        except OSError:
            time.sleep(0.5)
    return False


def ws_probe(host: str, port: int, path: str, host_header: str, want_banner: bool) -> str:
    """هندشیک WS + خواندن بنر — برای خودآزمایی محلی."""
    ns: dict = {}
    exec(compile(BRIDGE_SOURCE.strip(), "wsssh_server.py", "exec"), ns)
    s = socket.create_connection((host, port), timeout=10)
    key = base64.b64encode(os.urandom(16)).decode()
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host_header}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.settimeout(10)
    s.sendall(req.encode())
    resp = bytearray()
    while b"\r\n\r\n" not in resp:
        chunk = s.recv(4096)
        if not chunk:
            raise RuntimeError("closed during handshake")
        resp.extend(chunk)
    head = bytes(resp).split(b"\r\n\r\n")[0].decode("latin-1")
    status = head.split("\r\n")[0]
    if " 101 " not in status:
        raise RuntimeError(f"handshake status: {status[:120]}")
    head_part, _, leftover = bytes(resp).partition(b"\r\n\r\n")
    reader = ns["FrameReader"](s, leftover)
    banner = b""
    deadline = time.time() + 8
    while time.time() < deadline:
        opcode, payload = reader.frame()
        if opcode == 0x9:  # ping → pong
            s.sendall(ns["encode_frame"](0xA, payload))
            continue
        if opcode == 0x8:
            raise RuntimeError("closed by peer")
        if payload:
            banner += payload
            if not want_banner or b"SSH-" in banner:
                break
    s.close()
    return banner.decode("latin-1").strip()[:80]


def patch_nginx() -> None:
    conf_path = "/etc/nginx/sites-available/vodda.conf"
    if not os.path.exists(conf_path):
        fail("nginx-conf", f"{conf_path} not found")
    with open(conf_path, encoding="utf-8") as f:
        content = f.read()
    if "/wsssh/" in content:
        print("NGINX_ALREADY_PATCHED")
        return
    loc = """    location ^~ /wsssh/ {
        proxy_pass http://127.0.0.1:8123;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_buffering off;
    }
"""
    lines = content.split("\n")
    api_idx = None
    for i, line in enumerate(lines):
        if "server_name" in line and "api.vodda.ir" in line:
            api_idx = i
            break
    if api_idx is None:
        fail("nginx-conf", "api.vodda.ir server block not found")
    depth = 0
    insert_at = None
    for i in range(api_idx, len(lines)):
        line = lines[i]
        depth += line.count("{") - line.count("}")
        if depth == 1 and line.strip().startswith("location / {"):
            insert_at = i
            break
        if depth == 0 and i > api_idx:
            break
    if insert_at is None:
        fail("nginx-conf", "catch-all location not found in api block")
    lines.insert(insert_at, loc.rstrip("\n"))
    with open(conf_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("NGINX_PATCHED")


def fix_sshd() -> None:
    cfg_path = "/etc/ssh/sshd_config"
    with open(cfg_path, encoding="utf-8") as f:
        content = f.read()
    new_content, n = re.subn(r"(?mi)^\s*port\s+2222\s*$", "Port 22", content)
    if n == 0:
        if re.search(r"(?mi)^\s*Port\s+22\s*$", content):
            print("SSH_ALREADY_OK")
            return
        new_content = content.rstrip("\n") + "\nPort 22\n"
    with open(cfg_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    code, _, err = sh("sshd -t")
    if code != 0:
        fail("sshd-config", err)
    code, _, err = sh("systemctl restart ssh")
    if code != 0:
        fail("sshd-restart", err)
    print("SSH_PORT22_RESTORED")


def main() -> None:
    token = sys.argv[1] if len(sys.argv) > 1 else ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", token):
        fail("args", "usage: python3 - <TOKEN (8..64 alnum)>")
    path = f"/wsssh/{token}"

    bridge_dir = "/root/wsssh"
    os.makedirs(bridge_dir, exist_ok=True)
    with open(f"{bridge_dir}/wsssh_server.py", "w", encoding="utf-8") as f:
        f.write(BRIDGE_SOURCE.strip() + "\n")
    print("BRIDGE_WRITTEN")

    unit = f"""[Unit]
Description=Wodda SSH-over-WebSocket bridge
After=network.target ssh.service

[Service]
ExecStart=/usr/bin/python3 {bridge_dir}/wsssh_server.py 127.0.0.1 8123 127.0.0.1 22 {path}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
"""
    with open("/etc/systemd/system/wsssh.service", "w", encoding="utf-8") as f:
        f.write(unit)
    code, _, err = sh("systemctl daemon-reload && systemctl enable --now wsssh")
    if code != 0:
        fail("systemd", err)
    if not wait_port(8123):
        code, _, err = sh("systemctl status wsssh --no-pager -l | tail -20")
        fail("listen-8123", err or code)
    print("WSSSH_LISTEN_OK")

    patch_nginx()
    code, _, err = sh("nginx -t")
    if code != 0:
        fail("nginx-test", err)
    code, _, err = sh("systemctl reload nginx")
    if code != 0:
        fail("nginx-reload", err)
    print("NGINX_RELOADED")

    fix_sshd()

    try:
        banner = ws_probe("127.0.0.1", 8123, path, "127.0.0.1:8123", True)
        print(f"SELFTEST_DIRECT_BANNER={banner}")
    except Exception as exc:  # noqa: BLE001
        fail("selftest-direct", str(exc))

    try:
        banner = ws_probe("127.0.0.1", 80, path, "api.vodda.ir", True)
        print(f"SELFTEST_NGINX_BANNER={banner}")
    except Exception as exc:  # noqa: BLE001
        fail("selftest-nginx", str(exc))

    print("ALL_STEPS_DONE")
    print(f"WSSSH_PATH={path}")


if __name__ == "__main__":
    main()
