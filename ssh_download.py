#!/usr/bin/env python3
"""دانلود فایل از سرور vodda"""
import sys
import paramiko

HOST = "80.91.208.240"
USER = "root"
PASS = "JSiB0e975u"

if __name__ == "__main__":
    remote = sys.argv[1] if len(sys.argv) > 1 else "/tmp/remote-file"
    local = sys.argv[2] if len(sys.argv) > 2 else "/tmp/local-file"
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(HOST, username=USER, password=PASS, timeout=20, banner_timeout=20)
    sftp = cli.open_sftp()
    sftp.get(remote, local)
    sftp.close()
    cli.close()
    print(f"OK downloaded {remote} -> {local}")
