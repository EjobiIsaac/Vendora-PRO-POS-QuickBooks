import hashlib
# MUST be same SECRET as in app.py
SECRET = "SAVVY-SOFT-VENDORA-2026-X9K2M4P8Q1Z-SECRET"

print("=== Savvy Soft Technologies - Vendora PRO Key Generator ===")
print("This file is PRIVATE. Never share it. Never push to GitHub.")
machine = input("Paste customer's Machine ID: ").strip().upper()
raw = f"VENDORA|{machine}|{SECRET}"
h = hashlib.sha256(raw.encode()).hexdigest().upper()
safe = "".join([c for c in h if c not in "O0I1"])
key = f"SAVVY-{safe[0:4]}-{safe[4:8]}-{safe[8:12]}-{safe[12:16]}-{safe[16:20]}"
print(f"\nFOREVER KEY: {key}")
print("One key = One shop. Forever. No expiry.")
