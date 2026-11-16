#!/usr/bin/env python3
"""Persistent SSH tunnel to production MySQL (127.0.0.1:3422 on server) for local dev."""
import threading
import time
import select
import socket
import sys

import paramiko

HOST = "80.91.208.240"
USER = "root"
PASSWORD = "JSiB0e975u"
LOCAL_PORT = 13422
REMOTE_HOST = "127.0.0.1"
REMOTE_PORT = 3422


def forward(sock, channel):
    try:
        while True:
            data = sock.recv(16384)
            if not data:
                break
            channel.sendall(data)
    except Exception:
        pass
    finally:
        try:
            channel.close()
        except Exception:
            pass
        try:
            sock.close()
        except Exception:
            pass


def back_forward(channel, sock):
    try:
        while True:
            data = channel.recv(16384)
            if not data:
                break
            sock.sendall(data)
    except Exception:
        pass
    finally:
        try:
            sock.close()
        except Exception:
            pass
        try:
            channel.close()
        except Exception:
            pass


def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, look_for_keys=False, allow_agent=False)
    transport = client.get_transport()
    transport.set_keepalive(15)
    print(f"tunnel ready 127.0.0.1:{LOCAL_PORT} -> {REMOTE_HOST}:{REMOTE_PORT}", flush=True)

    server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_sock.bind(("127.0.0.1", LOCAL_PORT))
    server_sock.listen(16)

    while True:
        sock, _addr = server_sock.accept()
        try:
            channel = transport.open_channel(
                "direct-tcpip", (REMOTE_HOST, REMOTE_PORT), sock.getpeername()
            )
        except Exception as exc:
            print("channel open failed:", exc, flush=True)
            sock.close()
            continue
        threading.Thread(target=forward, args=(sock, channel), daemon=True).start()
        threading.Thread(target=back_forward, args=(channel, sock), daemon=True).start()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
