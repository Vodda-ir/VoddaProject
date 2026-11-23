#!/usr/bin/env python3
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
    main()
