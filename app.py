import os
import sys
import json
import hashlib
import sqlite3
import datetime
import uuid
import shutil
import winreg
import webview

APP_NAME = "Vendora PRO"
COMPANY = "Savvy Soft Technologies"
PHONES = "0770960837 / 0702788215"
TRIAL_DAYS = 14

# Safe for GitHub: set VENDORA_SECRET in your PC environment or GitHub Actions Secrets
SECRET = os.environ.get("VENDORA_SECRET", "CHANGE-ME-BEFORE-BUILD")

BASE = os.path.join(os.path.expanduser("~"), ".VendoraPRO")
os.makedirs(BASE, exist_ok=True)
STATE_FILE = os.path.join(BASE, "state.dat")
DB_FILE = os.path.join(BASE, "vendora.db")

def resource_path(relative_path):
    """Works both on laptop and inside PyInstaller EXE."""
    base_path = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, relative_path)

def machine_id():
    """Stable hardware/OS ID that survives Wi-Fi/Ethernet toggles and Windows user changes."""
    hw_guid = ""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
            0,
            winreg.KEY_READ | winreg.KEY_WOW64_64KEY
        )
        hw_guid, _ = winreg.QueryValueEx(key, "MachineGuid")
        winreg.CloseKey(key)
    except Exception:
        hw_guid = str(uuid.getnode())

    raw = f"{hw_guid}|{os.environ.get('COMPUTERNAME', '')}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12].upper()

def create_desktop_shortcut():
    """
    Automatically copies / creates Vendora PRO shortcut on Desktop
    on every startup. If it already exists, it does nothing.
    Works even without win32com installed (uses PowerShell fallback).
    """
    try:
        # 1. Find the real EXE path
        if getattr(sys, 'frozen', False):
            exe_path = sys.executable  # Inside PyInstaller EXE
        else:
            # When running as .py, point to the EXE if it exists next to it, else the .py itself
            exe_path = os.path.abspath(sys.argv[0])

        if not exe_path or not os.path.exists(exe_path):
            return

        # 2. Find Desktop
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        if not os.path.exists(desktop):
            # Try OneDrive Desktop
            onedrive_desktop = os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop")
            if os.path.exists(onedrive_desktop):
                desktop = onedrive_desktop
            else:
                return

        shortcut_path = os.path.join(desktop, "Vendora PRO.lnk")

        # 3. Don't overwrite if already there
        if os.path.exists(shortcut_path):
            return

        # 4. Try Method 1: win32com (cleanest)
        try:
            import win32com.client
            shell = win32com.client.Dispatch("WScript.Shell")
            shortcut = shell.CreateShortCut(shortcut_path)
            shortcut.Targetpath = exe_path
            shortcut.WorkingDirectory = os.path.dirname(exe_path)
            shortcut.IconLocation = exe_path
            shortcut.Description = "Vendora PRO - POS + Accounting"
            shortcut.save()
            return
        except Exception:
            pass

        # 5. Method 2 Fallback: PowerShell (always works on Windows, no extra install)
        try:
            import subprocess
            ps_script = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('{shortcut_path}')
$Shortcut.TargetPath = '{exe_path}'
$Shortcut.WorkingDirectory = '{os.path.dirname(exe_path)}'
$Shortcut.IconLocation = '{exe_path}'
$Shortcut.Description = 'Vendora PRO - POS + Accounting'
$Shortcut.Save()
"""
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, timeout=10)
        except Exception:
            pass

    except Exception as e:
        print(f"Shortcut creation skipped: {e}")

def _xor(data, key):
    return bytes([b ^ ord(key[i % len(key)]) for i, b in enumerate(data)])

def load_state():
    today = datetime.date.today().isoformat()
    if not os.path.exists(STATE_FILE):
        state = {
            "first_run": today,
            "last_seen": today,
            "license": "",
            "license_valid": False
        }
        save_state(state)
        return state
    try:
        with open(STATE_FILE, "rb") as f:
            raw = f.read()
        state = json.loads(_xor(raw, SECRET).decode())
        if "last_seen" not in state:
            state["last_seen"] = state.get("first_run", today)
        return state
    except Exception:
        # Tampered state.dat = immediate lock
        return {"first_run": "2000-01-01", "last_seen": today, "license": "", "license_valid": False}

def save_state(state):
    with open(STATE_FILE, "wb") as f:
        f.write(_xor(json.dumps(state).encode(), SECRET))

def make_key_for_machine(machine):
    raw = f"VENDORA|{machine}|{SECRET}"
    h = hashlib.sha256(raw.encode()).hexdigest().upper()
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
        state = load_state()
        first = datetime.date.fromisoformat(state["first_run"])
        last_seen = datetime.date.fromisoformat(state.get("last_seen", state["first_run"]))
        today = datetime.date.today()

        # Anti-date rollback check: lock if Windows clock was moved backwards
        if today < last_seen:
            return True

        # Advance last_seen forward when a new day starts
        if today > last_seen:
            state["last_seen"] = today.isoformat()
            save_state(state)

        return (today - first).days >= TRIAL_DAYS
    except Exception:
        return True

def init_db():
    con = sqlite3.connect(DB_FILE)
    con.execute("CREATE TABLE IF NOT EXISTS kv_store(k TEXT PRIMARY KEY, v TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, data TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS sales(id INTEGER PRIMARY KEY, data TEXT)")
    con.execute("CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY, who TEXT, action TEXT, time TEXT)")
    con.commit()
    con.close()

class Api:
    def get_status(self):
        return {
            "locked": trial_expired(),
            "licensed": is_licensed(),
            "company": COMPANY,
            "phones": PHONES,
            "machine": machine_id()
        }

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

    # --- SQLite Persistent Storage Bridge (Keeps exact JSON strings for localStorage) ---
    def load_all_data(self):
        con = sqlite3.connect(DB_FILE)
        rows = con.execute("SELECT k, v FROM kv_store").fetchall()
        con.close()
        return {k: v for k, v in rows}

    def set_item(self, key, value):
        to_save = value if isinstance(value, str) else json.dumps(value)
        con = sqlite3.connect(DB_FILE)
        con.execute("INSERT OR REPLACE INTO kv_store(k, v) VALUES (?, ?)", (str(key), to_save))
        con.commit()
        con.close()
        return True

    def remove_item(self, key):
        con = sqlite3.connect(DB_FILE)
        con.execute("DELETE FROM kv_store WHERE k = ?", (str(key),))
        con.commit()
        con.close()
        return True

    def clear_all_data(self):
        con = sqlite3.connect(DB_FILE)
        con.execute("DELETE FROM kv_store")
        con.commit()
        con.close()
        return True

    def backup_database_file(self):
        if not webview.windows:
            return {"ok": False}
        stamp = datetime.date.today().isoformat()
        target = webview.windows[0].create_file_dialog(
            webview.SAVE_DIALOG,
            save_filename=f"VendoraPRO_FullBackup_{stamp}.db"
        )
        if target:
            dest = target[0] if isinstance(target, (list, tuple)) else target
            shutil.copy2(DB_FILE, dest)
            return {"ok": True, "path": dest}
        return {"ok": False}

if __name__ == "__main__":
    init_db()
    create_desktop_shortcut()
    api = Api()
    start_page = "lock.html" if trial_expired() else "index.html"
    html = resource_path(start_page)
    win = webview.create_window(APP_NAME, url=html, js_api=api, width=1280, height=800)
    webview.start()
