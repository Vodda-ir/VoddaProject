#!/usr/bin/env python3
"""SSH runner via paramiko with password auth to vodda server."""
import sys
import paramiko

HOST = "80.91.208.240"
PORT = 22
USER = "root"
PASSWORD = "JSiB0e975u"

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "echo SSH_OK"
    timeout = float(sys.argv[2]) if len(sys.argv) > 2 else 30.0
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        cli.connect(HOST, port=PORT, username=USER, password=PASSWORD,
                    timeout=timeout, banner_timeout=timeout, auth_timeout=timeout)
        stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode(errors="replace")
        err = stderr.read().decode(errors="replace")
        print(out)
        if err.strip():
            print("STDERR:", err)
        sys.exit(stdout.channel.recv_exit_status() or 0)
    except Exception as e:
        print(f"SSH_ERROR: {type(e).__name__}: {e}")
        sys.exit(255)
    finally:
        cli.close()

if __name__ == "__main__":
    main()
