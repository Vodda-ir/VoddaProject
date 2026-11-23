#!/usr/bin/env python3
# کلاینت تونل SSH-over-WebSocket — فقط کتابخانهٔ استاندارد
# استفاده به‌عنوان ProxyCommand:
#   ssh -o ProxyCommand="python3 scripts/wssh_proxy.py <host> <port> <tls> <path>" user@target
# stdin/stdout = جریان بایت SSH؛ انتقال از طریق ws(s)://host:port/path به پل سمت سرور
import base64
import hashlib
import os
import select
import signal
import socket
import ssl
import struct
import sys

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
FRAME_MAX = 32768
SOCK_TIMEOUT = 30
OP_CONT, OP_TEXT, OP_BIN, OP_CLOSE, OP_PING, OP_PONG = 0x0, 0x1, 0x2, 0x8, 0x9, 0xA


def die(msg: str, code: int = 1) -> None:
    sys.stderr.write(f"wssh_proxy: {msg}\n")
    sys.stderr.flush()
    sys.exit(code)


def mask_bytes(data: bytes, key: bytes) -> bytes:
    if not data:
        return data
    ext = (key * (len(data) // 4 + 1))[: len(data)]
    return (int.from_bytes(data, "big") ^ int.from_bytes(ext, "big")).to_bytes(len(data), "big")


def encode_frame(opcode: int, payload: bytes, mask: bool = True) -> bytes:
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
    """خوانش فریم WS روی سوکت بلوک‌کننده با تایم‌اوت — بدون گم‌شدن بایت."""

    def __init__(self, sock: socket.socket, leftover: bytes = b""):
        self.sock = sock
        self.buf = bytearray(leftover)

    def _need(self, n: int) -> bytes:
        while len(self.buf) < n:
            try:
                chunk = self.sock.recv(65536)
            except (socket.timeout, TimeoutError):
                raise TimeoutError("ws read stalled")
            if not chunk:
                raise ConnectionError("connection closed")
            self.buf.extend(chunk)
        out = bytes(self.buf[:n])
        del self.buf[:n]
        return out

    def frame(self):
        """(opcode, payload) — fragmentation را جمع می‌کند؛ کنترلی‌ها را زودتر برمی‌گرداند."""
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
            if n > 1 << 23:
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


def handshake(sock, host: str, port: int, path: str) -> bytes:
    key = base64.b64encode(os.urandom(16)).decode()
    host_header = host if port in (80, 443) else f"{host}:{port}"
    req = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host_header}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n"
        "\r\n"
    )
    sock.sendall(req.encode())
    resp = bytearray()
    while b"\r\n\r\n" not in resp:
        chunk = sock.recv(4096)
        if not chunk:
            raise ConnectionError("handshake: connection closed")
        resp.extend(chunk)
        if len(resp) > 65536:
            raise ConnectionError("handshake: response too large")
    head, _, rest = bytes(resp).partition(b"\r\n\r\n")
    lines = head.decode("latin-1").split("\r\n")
    status = lines[0] if lines else ""
    if " 101 " not in status:
        raise RuntimeError(f"handshake status: {status[:140]} (مسیر/توکن یا پشتیبانی WS در لبه را بررسی کنید)")
    accept = ""
    for line in lines[1:]:
        name, _, value = line.partition(":")
        if name.strip().lower() == "sec-websocket-accept":
            accept = value.strip()
    expected = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
    if accept and accept != expected:
        raise RuntimeError("handshake: bad Sec-WebSocket-Accept")
    return rest


def main() -> None:
    if len(sys.argv) < 5:
        die("usage: wssh_proxy.py <host> <port> <tls:true|false> <path>")
    host, port_s, tls_s, path = sys.argv[1], sys.argv[2], sys.argv[3].lower(), sys.argv[4]
    try:
        port = int(port_s)
    except ValueError:
        die(f"bad port: {port_s}")
    try:
        sock = socket.create_connection((host, port), timeout=15)
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        if tls_s in ("true", "1", "yes", "tls", "wss"):
            ctx = ssl.create_default_context()
            sock = ctx.wrap_socket(sock, server_hostname=host)
    except Exception as exc:  # noqa: BLE001
        die(f"connect failed: {exc}", 25)
    sock.settimeout(SOCK_TIMEOUT)

    try:
        reader = FrameReader(sock, handshake(sock, host, port, path))
    except Exception as exc:  # noqa: BLE001
        die(f"handshake failed: {exc}", 25)

    signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    out = sys.stdout.buffer
    stdin_fd = sys.stdin.fileno()
    try:
        os.set_blocking(stdin_fd, False)
    except (AttributeError, OSError):
        pass

    stdin_done = False
    try:
        while True:
            watch = [sock] if stdin_done else [sock, stdin_fd]
            rlist, _, _ = select.select(watch, [], [], 20)
            if sock in rlist:
                try:
                    opcode, payload = reader.frame()
                except TimeoutError:
                    # سکوت شبکه — پینگ نگه‌دارنده و ادامه
                    try:
                        sock.sendall(encode_frame(OP_PING, b"wssh-ka"))
                    except OSError:
                        break
                    continue
                except (ConnectionError, ssl.SSLError, OSError):
                    break
                if opcode == OP_CLOSE:
                    break
                if opcode == OP_PING:
                    try:
                        sock.sendall(encode_frame(OP_PONG, payload))
                    except OSError:
                        break
                    continue
                if opcode == OP_PONG:
                    continue
                if payload:
                    try:
                        out.write(payload)
                        out.flush()
                    except (OSError, ValueError):
                        break
            if (not stdin_done) and stdin_fd in rlist:
                try:
                    data = os.read(stdin_fd, FRAME_MAX)
                except BlockingIOError:
                    data = None
                except OSError:
                    data = b""
                if data is None:
                    pass
                elif not data:
                    # EOF ورودی استاندارد = نیم‌بستار؛ تونل تا بستن سمت سرور باز می‌ماند
                    stdin_done = True
                    try:
                        sock.sendall(encode_frame(OP_PING, b"wssh-eof"))
                    except OSError:
                        break
                else:
                    try:
                        sock.sendall(encode_frame(OP_BIN, data))
                    except (OSError, ssl.SSLError):
                        break
            elif not rlist:
                # سکوت کامل — پینگ نگه‌دارنده
                try:
                    sock.sendall(encode_frame(OP_PING, b"wssh-ka"))
                except OSError:
                    break
    except KeyboardInterrupt:
        pass
    try:
        sock.close()
    except OSError:
        pass
    sys.exit(0)


if __name__ == "__main__":
    main()
