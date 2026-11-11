#!/usr/bin/env python3
"""اجرای دستور detached روی سرور — بدون انتظار برای خروجی"""
import sys
import time
import paramiko

HOST = "80.91.208.240"
USER = "root"
PASS = "JSiB0e975u"

cmd = sys.argv[1] if len(sys.argv) > 1 else "echo NO_CMD"

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(HOST, username=USER, password=PASS, timeout=20, banner_timeout=20)
# brc = Bourne-shell: فول‌ردایرکت شده، بدون نگه‌داشتن fd
transport = cli.get_transport()
chan = transport.open_session()
chan.exec_command(cmd + " > /dev/null 2>&1 < /dev/null &")
time.sleep(1)
chan.close()
print("DETACHED_OK")
cli.close()
