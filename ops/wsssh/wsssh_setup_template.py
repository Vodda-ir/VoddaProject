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

BRIDGE_SOURCE = r'''@@BRIDGE@@'''


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
    # درج بلافاصله پس از server_name بلاک api — همیشه داخل بلاک است و ^~ اولویت طول دارد
    lines.insert(api_idx + 1, loc.rstrip("\n"))
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
