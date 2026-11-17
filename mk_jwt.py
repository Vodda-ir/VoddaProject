import hmac, hashlib, base64, json, time

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

secret = "ce41279c3e941445f18b8ae3e92d05fca97eae49b43a3be86e59dbd8d17f5ea3"

header = {"alg": "HS256", "typ": "JWT"}
now = int(time.time())
payload = {"uid": 47, "role": "learner", "iss": "vodda", "iat": now, "exp": now + 604800}

h = b64url(json.dumps(header, separators=(",", ":")).encode())
p = b64url(json.dumps(payload, separators=(",", ":")).encode())
sig = b64url(hmac.new(secret.encode(), f"{h}.{p}".encode(), hashlib.sha256).digest())

token = f"{h}.{p}.{sig}"
with open("/home/z/my-project/learner_token.txt", "w") as f:
    f.write(token)
print(token)
