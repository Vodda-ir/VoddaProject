#!/usr/bin/env python3
"""آپلود بسته src فرانت به سرور vodda از طریق SFTP"""
import paramiko

HOST = "80.91.208.240"
USER = "root"
PASS = "JSiB0e975u"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=20, banner_timeout=20)

sftp = cli.open_sftp()
sftp.put("/tmp/be-src-sync.tar.gz", "/www/wwwroot/vodda/be-src-sync.tar.gz")
print("UPLOAD_OK")
sftp.close()
cli.close()
