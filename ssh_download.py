#!/usr/bin/env python3
"""دانلود فایل از سرور vodda از طریق SFTP: ssh_download.py <remote_path> <local_path>"""
import sys
import paramiko

HOST = "80.91.208.240"
USER = "root"
PASS = "JSiB0e975u"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=20, banner_timeout=20)
sftp = cli.open_sftp()
remote = sys.argv[1] if len(sys.argv) > 1 else "/tmp/vodda-backend-full.tar.gz"
local = sys.argv[2] if len(sys.argv) > 2 else "/tmp/vodda-backend-full.tar.gz"
sftp.get(remote, local)
print("DOWNLOAD_OK", local)
sftp.close()
cli.close()
