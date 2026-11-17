p = "/etc/nginx/sites-available/vodda.conf"
s = open(p).read()
needle = "    location / {\n        rewrite ^/$ /app break;"
assert s.count(needle) == 1, s.count(needle)
ins = "    location ^~ /panel/ {\n        proxy_pass http://vodda_frontend;\n    }\n\n    location = /panel {\n        proxy_pass http://vodda_frontend;\n    }\n\n"
s = s.replace(needle, ins + needle)
open(p, "w").write(s)
print("PATCHED")
