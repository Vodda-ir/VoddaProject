#!/usr/bin/env python3
"""End-to-end TURN relay test against 80.91.208.240:3478 (RFC 5766, long-term creds).

Verifies:
  1. UDP 3478 reachable from an external network (Allocate round-trip).
  2. Allocation succeeds with vodda creds -> XOR-RELAYED-ADDRESS port within 49160-49200.
  3. Egress: Send indication from relay port reaches an external UDP echo peer.
  4. Ingress: peer's echo (inbound UDP to the relay port) comes back as Data indication.
A full round-trip proves relayed media is NOT blackholed.
"""
import hashlib, hmac, os, socket, struct, sys, threading, time

SERVER = ("80.91.208.240", 3478)
USER, PASS = "vodda", "Vd-turn-2026!x7Kq"
MAGIC = 0x2112A442
PEER_PORT = 55999

def tid(): return os.urandom(12)

def attr(t, v):
    return struct.pack("!HH", t, len(v)) + v + b"\x00" * ((4 - len(v) % 4) % 4)

def msg(t, attrs, txid=None):
    body = b"".join(attrs)
    if txid is None: txid = tid()
    return struct.pack("!HHI", t, len(body), MAGIC) + txid + body

def parse(data):
    t, ln, _ = struct.unpack("!HHI", data[:8])
    txid = data[8:20]
    attrs, off, end = {}, 20, 20 + ln
    while off + 4 <= end:
        at, al = struct.unpack("!HH", data[off:off+4])
        attrs[at] = data[off+4:off+4+al]
        off += 4 + al + ((4 - al % 4) % 4)
    return t, attrs, txid

def xor_enc(ip, port):
    return (b"\x00\x01" + struct.pack("!H", port ^ (MAGIC >> 16))
            + bytes(b ^ m for b, m in zip(socket.inet_aton(ip), struct.pack("!I", MAGIC))))

def xor_dec(v):
    port = struct.unpack("!H", v[2:4])[0] ^ (MAGIC >> 16)
    ip = bytes(b ^ m for b, m in zip(v[4:8], struct.pack("!I", MAGIC)))
    return socket.inet_ntoa(ip), port

def signed_pkt(t, body_attrs, key, txid):
    body = b"".join(body_attrs)
    hdr = struct.pack("!HHI", t, len(body) + 24, MAGIC) + txid
    mi = hmac.new(key, hdr + body, hashlib.sha1).digest()
    return hdr + body + attr(0x0008, mi)

def send_recv(sock, packet, want_types, tries=4):
    txid = packet[8:20]
    for i in range(tries):
        sock.sendto(packet, SERVER)
        end = time.time() + 1.5 + i
        while time.time() < end:
            sock.settimeout(max(0.1, end - time.time()))
            try:
                data, _ = sock.recvfrom(4096)
            except socket.timeout:
                break
            t, a, rtx = parse(data)
            if rtx == txid and t in want_types:
                return t, a
    return None, None

def peer_thread(results):
    p = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    p.bind(("0.0.0.0", PEER_PORT))
    p.settimeout(15)
    # Warm NAT: binding request to 3478 + junk to relay range endpoints
    for dst_port in (3478, 49160, 49161, 49162, 49163, 49164):
        try: p.sendto(b"\x00\x01\x00\x00" + os.urandom(16), ("80.91.208.240", dst_port))
        except OSError: pass
    # Get our external mapped addr for the peer socket via Binding response
    mapped = None
    pkt = msg(0x0001, [], tid())
    for _ in range(3):
        p.sendto(pkt, SERVER)
        try:
            data, _ = p.recvfrom(4096)
            t, a, _ = parse(data)
            if t == 0x0101 and 0x0020 in a:
                mapped = xor_dec(a[0x0020]); break
        except socket.timeout:
            pass
    results["peer_mapped"] = mapped
    results["peer_from"] = None
    got_echo = False
    try:
        while time.time() < time.time() + 1:  # bounded below by settimeout
            data, frm = p.recvfrom(2048)
            results["peer_from"] = frm
            if data == b"VODDA-RELAY-TEST":
                got_echo = True
                results["peer_got_payload"] = True
                p.sendto(data, frm)  # echo back to relay port
            if got_echo and results.get("data_ind"):
                break
    except socket.timeout:
        pass
    results["peer_got_payload"] = got_echo

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(("0.0.0.0", 0))

    print("[1] Allocate #1 (expect 401 challenge)...")
    t, a = send_recv(s, msg(0x0003, [attr(0x0019, struct.pack("!Bxxx", 17))]), {0x0113, 0x0103})
    if t is None:
        print("FAIL: no response to Allocate -> UDP 3478 unreachable from outside"); sys.exit(1)
    if t != 0x0113:
        print(f"    unexpected type 0x{t:04x}, attrs={ {hex(k): v.hex() for k, v in a.items()} }")
    realm = a.get(0x0014, b"vodda.ir").decode(errors="replace")
    nonce = a.get(0x0015)
    print(f"    got 0x{t:04x}: realm={realm!r} nonce_len={len(nonce) if nonce else 0}")
    if nonce is None:
        print("FAIL: no nonce"); sys.exit(1)
    key = hashlib.md5(f"{USER}:{realm}:{PASS}".encode()).digest()

    print("[2] Allocate #2 (authenticated, REQUESTED-TRANSPORT=UDP)...")
    t, a = send_recv(s, signed_pkt(0x0003, [
        attr(0x0019, struct.pack("!Bxxx", 17)),
        attr(0x0006, USER.encode()), attr(0x0014, realm.encode()), attr(0x0015, nonce),
    ], key, tid()), {0x0113, 0x0103})
    if t == 0x0103 and 0x0016 in a:
        relay = xor_dec(a[0x0016]); mapped = xor_dec(a.get(0x0020, b""))
        life = struct.unpack("!I", a[0x000d])[0] if 0x000d in a else "?"
        print(f"    SUCCESS lifetime={life}s")
        print(f"    XOR-RELAYED-ADDRESS = {relay[0]}:{relay[1]}")
        print(f"    XOR-MAPPED-ADDRESS  = {mapped[0]}:{mapped[1]} (our external vantage)")
        in_range = 49160 <= relay[1] <= 49200
        print(f"    relay port in 49160-49200 range: {in_range}")
    else:
        print(f"FAIL: Allocate -> 0x{t:04x} {a.get(0x0009, b'')!r}"); sys.exit(1)
    if not in_range:
        print("FAIL: relay port outside configured range"); sys.exit(1)

    results = {}
    th = threading.Thread(target=peer_thread, args=(results,), daemon=True)
    th.start()
    th.join(6)
    peer_addr = results.get("peer_mapped")
    if not peer_addr:
        print("FAIL: could not determine external peer vantage address"); sys.exit(1)
    print(f"[3] Peer echo listening at external vantage {peer_addr[0]}:{peer_addr[1]}")

    print("[4] CreatePermission + Send indication -> Data indication round-trip...")
    t, a = send_recv(s, signed_pkt(0x0008, [
        attr(0x0012, xor_enc(*peer_addr)),
        attr(0x0006, USER.encode()), attr(0x0014, realm.encode()), attr(0x0015, nonce),
    ], key, tid()), {0x0118, 0x0108})
    if t in (0x0108, None):
        print(f"    CreatePermission -> OK (0x{t:04x})" if t else "    CreatePermission -> no response yet")
    else:
        print(f"    CreatePermission -> 0x{t:04x} {a.get(0x0009, b'')!r}")

    payload = b"VODDA-RELAY-TEST"
    got = None
    deadline = time.time() + 10
    n = 0
    while time.time() < deadline and got is None:
        n += 1
        s.sendto(msg(0x0016, [attr(0x0012, xor_enc(*peer_addr)), attr(0x0013, payload)]), SERVER)
        s.settimeout(1.0)
        try:
            data, addr = s.recvfrom(4096)
            t2, a2, _ = parse(data)
            if t2 == 0x0017 and 0x0013 in a2:
                got = (a2[0x0013], addr)
        except socket.timeout:
            pass
    th.join(2)
    print(f"    Send indications sent: {n}")
    print(f"    Data indication received: {bool(got)}" + (f" from {got[1][0]}:{got[1][1]} payload={got[0][:40]!r}" if got else ""))
    print(f"    Peer received relayed packet: {results.get('peer_got_payload')}"
          f" from {results.get('peer_from')}")

    ok = bool(got) and got[0][:16] == payload and results.get("peer_got_payload")
    print()
    print("VERDICT:", "RELAY WORKS END-TO-END (media not blackholed)" if ok
          else "RELAY BROKEN (round-trip failed)")
    sys.exit(0 if ok else 2)

if __name__ == "__main__":
    main()
