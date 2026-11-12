#!/usr/bin/env python3
"""اجرای دستور روی سرور vodda از طریق SSH"""
import sys
import paramiko

HOST = "80.91.208.240"
USER = "root"
PASS = "JSiB0e975u"


def run(cmd: str, timeout: int = 120) -> int:
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, password=PASS, timeout=20, banner_timeout=20)
    stdin, stdout, stderr = cli.exec_command(cmd, timeout=timeout, get_pty=False)
    out = stdout.read().decode("utf-8", "replace")
    err = stderr.read().decode("utf-8", "replace")
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err:
        print(err, file=sys.stderr)
    cli.close()
    return code


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "echo NO_CMD"
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 120
    sys.exit(run(cmd, timeout))
