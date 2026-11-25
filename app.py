import os, json, hashlib, sqlite3, datetime, uuid, webview

APP_NAME = "Vendora PRO"
COMPANY = "Savvy Soft Technologies"
PHONES = "0770960837 / 0702788215"
TRIAL_DAYS = 14
# !!! CHANGE THIS TO YOUR OWN SECRET. Never share it. Never push keygen.py to GitHub !!!
SECRET = "SAVVY-SOFT-VENDORA-2026-X9K2M4P8Q1Z-SECRET"

BASE = os.path.join(os.path.expanduser("~"), ".VendoraPRO")
os.makedirs(BASE, exist_ok=True)
STATE_FILE = os.path.join(BASE, "state.dat")
DB_FILE = os.path.join(BASE, "vendora.db")

def machine_id():
    raw = str(uuid.getnode()) + os.environ.get("COMPUTERNAME","") + os.environ.get("USERNAME","")
    return hashlib.sha256(raw.encode()).hexdigest()[:12].upper()

def _xor(data, key):
    return bytes([b ^ ord(key[i % len(key)]) for i, b in enumerate(data)])

def load_state():
    if not os.path.exists(STATE_FILE):
        state = {"first_run": datetime.date.today().isoformat(), "license": "", "license_valid": False}
        save_state(state)
        return state
    try:
        raw = open(STATE_FILE, "rb").read()
        return json.loads(_xor(raw, SECRET).decode())
    except:
        return {"first_run": "2000-01-01", "license": "", "license_valid": False}

def save_state(state):
    open(STATE_FILE, "wb").write(_xor(json.dumps(state).encode(), SECRET))

def make_key_for_machine(machine):
    # Hard mixed key: letters + numbers, no O/0/I/1 confusion
    raw = f"VENDORA|{machine}|{SECRET}"
    h = hashlib.sha256(raw.encode()).hexdigest().upper()
    # Filter to safe chars
    safe = "".join([c for c in h if c not in "O0I1"])
    return f"SAVVY-{safe[0:4]}-{safe[4:8]}-{safe[8:12]}-{safe[12:16]}-{safe[16:20]}"

def is_licensed():
    s = load_state()
    if not s.get("license_valid"):
        return False
    return s.get("license") == make_key_for_machine(machine_id())

def trial_expired():
    if is_licensed():
        return False
    try:
        first = datetime.date.fromisoformat(load_state()["first_run"])
    except:
        return True
    return (datetime.date.today() - first).days >= TRIAL_DAYS

class Api:
    def get_status(self):
        return {"locked": trial_expired(), "company": COMPANY, "phones": PHONES, "machine": machine_id()}
    def activate(self, key):
        key = key.strip().upper().replace(" ", "")
        if key == make_key_for_machine(machine_id()):
            s = load_state()
            s["license"] = key
            s["license_valid"] = True
            save_state(s)
            return {"ok": True}
        return {"ok": False, "msg": f"Invalid Key. Buy original from {COMPANY} - {PHONES}"}
    def get_machine_id(self):
        return machine_id()

def init_db():
    con = sqlite3.connect(DB_FILE)
    con.execute("CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, data TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS sales(id INTEGER PRIMARY KEY, data TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY, who TEXT, action TEXT, time TEXT)")
    con.commit(); con.close()

if __name__ == "__main__":
    init_db()
    api = Api()
    html = os.path.join(os.path.dirname(__file__), "index.html")
    win = webview.create_window(APP_NAME, url=html, js_api=api, width=1280, height=800)
    webview.start()
