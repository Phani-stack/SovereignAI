import hashlib
import json
import logging
import secrets
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
USERS_FILE = DATA_DIR / "users.json"

# In-memory session store mapping token -> username
SESSIONS = {}

ALL_ABILITIES = [
    "can_use_chat",
    "can_upload_documents",
    "can_delete_documents",
    "can_search_rag",
    "can_execute_code",
    "can_use_vision",
    "can_manage_users",
]


def _hash_password(password: str) -> str:
    """Hash password using SHA-256 with static salt for offline compatibility."""
    salt = "sovai_secure_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not USERS_FILE.exists():
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=2)


def _read_users_file() -> dict:
    _ensure_data_dir()
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading users file: {e}")
        return {}


def _write_users_file(users_dict: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users_dict, f, indent=2)
    except Exception as e:
        logger.error(f"Error writing users file: {e}")



def initialize_default_users(force: bool = False):
    """Seed default system users if users.json is empty or force=True."""
    users = _read_users_file()
    defaults = {
        "admin": {
            "username": "admin",
            "password_hash": _hash_password("admin123"),
            "role": "Administrator",
            "abilities": ["*"],
            "allowed_documents": [],
            "allowed_folders": ["*"],
            "created_at": datetime.now().isoformat(),
        },
        "user": {
            "username": "user",
            "password_hash": _hash_password("user123"),
            "role": "User",
            "abilities": [
                "can_use_chat",
                "can_search_rag",
                "can_upload_documents",
                "can_execute_code",
                "can_use_vision",
            ],
            "allowed_documents": [],
            "allowed_folders": ["*"],
            "created_at": datetime.now().isoformat(),
        },
        "viewer": {
            "username": "viewer",
            "password_hash": _hash_password("viewer123"),
            "role": "User",
            "abilities": ["can_use_chat", "can_search_rag"],
            "allowed_documents": [],
            "allowed_folders": ["*"],
            "created_at": datetime.now().isoformat(),
        }
    }

    modified = False
    if not users:
        for uname, udata in defaults.items():
            users[uname] = udata
        modified = True
    elif force:
        for uname, udata in defaults.items():
            users[uname] = udata
        modified = True

    if modified:
        _write_users_file(users)
        logger.info("Initialized default SovereignAI IAM users")


def sanitize_user(user: dict) -> dict:
    """Return user dict without sensitive password_hash."""
    if not user:
        return {}
    c = dict(user)
    c.pop("password_hash", None)
    return c


def authenticate_user(username: str, password: str):
    """Verify credentials and create session token."""
    initialize_default_users()
    users = _read_users_file()
    user = users.get(username.strip().lower())
    if not user:
        return None, "User not found"

    if user["password_hash"] != _hash_password(password):
        return None, "Invalid password"

    token = f"sovai_token_{secrets.token_hex(16)}"
    SESSIONS[token] = user["username"]
    return token, sanitize_user(user)


def get_user_by_token(token: str):
    """Retrieve active user profile by session token."""
    if not token:
        return None
    initialize_default_users()
    username = SESSIONS.get(token)
    if not username:
        # Fallback check if token is "admin_token" for dev/testing
        if token in ("admin_token", "default_admin_token"):
            username = "admin"
        else:
            return None
    users = _read_users_file()
    user = users.get(username)
    return sanitize_user(user) if user else None


def list_all_users():
    """List all registered users for Admin panel."""
    initialize_default_users()
    users = _read_users_file()
    return [sanitize_user(u) for u in users.values()]


def create_user(username: str, password: str, role: str = "User", abilities: list = None, allowed_documents: list = None, allowed_folders: list = None):
    """Create a new user with assigned role, abilities, document access, and folder access."""
    initialize_default_users()
    users = _read_users_file()
    u_clean = username.strip().lower()

    if u_clean in users:
        raise ValueError(f"User '{username}' already exists.")

    if abilities is None:
        abilities = ["can_use_chat", "can_search_rag"]
    if allowed_documents is None:
        allowed_documents = []
    if allowed_folders is None:
        allowed_folders = ["*"]

    new_user = {
        "username": u_clean,
        "password_hash": _hash_password(password),
        "role": role,
        "abilities": abilities,
        "allowed_documents": allowed_documents,
        "allowed_folders": allowed_folders,
        "created_at": datetime.now().isoformat(),
    }
    users[u_clean] = new_user
    _write_users_file(users)
    return sanitize_user(new_user)


def update_user_abilities(username: str, abilities: list = None, allowed_documents: list = None, allowed_folders: list = None, role: str = None):
    """Update role, attached IAM abilities, document access list, and folder access list for a user."""
    initialize_default_users()
    users = _read_users_file()
    u_clean = username.strip().lower()

    if u_clean not in users:
        raise ValueError(f"User '{username}' not found.")

    user = users[u_clean]
    if abilities is not None:
        user["abilities"] = abilities
    if allowed_documents is not None:
        user["allowed_documents"] = allowed_documents
    if allowed_folders is not None:
        user["allowed_folders"] = allowed_folders
    if role is not None:
        user["role"] = role

    users[u_clean] = user
    _write_users_file(users)
    return sanitize_user(user)


def delete_user(username: str):
    """Delete a user account."""
    initialize_default_users()
    users = _read_users_file()
    u_clean = username.strip().lower()

    if u_clean == "admin":
        raise ValueError("Cannot delete root 'admin' user.")

    if u_clean in users:
        del users[u_clean]
        _write_users_file(users)
        # Clear active sessions for this user
        to_del = [tok for tok, uname in SESSIONS.items() if uname == u_clean]
        for tok in to_del:
            del SESSIONS[tok]
        return True
    return False


def has_ability(user: dict, ability: str) -> bool:
    """Check if user has a specific ability or full admin rights."""
    if not user:
        return False
    if user.get("role") == "Administrator" or "*" in user.get("abilities", []):
        return True
    return ability in user.get("abilities", [])


def can_access_document(user: dict, doc_filename: str, folder_name: str = None) -> bool:
    """Check if user is allowed to access a specific document."""
    if not user:
        return False
    if user.get("role") == "Administrator" or "*" in user.get("abilities", []):
        return True
    
    allowed_folders = user.get("allowed_folders", [])
    allowed_docs = user.get("allowed_documents", [])

    # If allowed_documents is explicitly specified (and not '*'), check it first
    if allowed_docs and "*" not in allowed_docs:
        clean_doc = doc_filename.strip().lower()
        return any(d.strip().lower() == clean_doc or clean_doc in d.strip().lower() for d in allowed_docs)

    if "*" in allowed_folders or "*" in allowed_docs:
        return True

    if folder_name and can_access_folder(user, folder_name):
        return True

    if not allowed_folders:
        return True
    if folder_name:
        return can_access_folder(user, folder_name)
    return True


def can_access_folder(user: dict, folder_name: str) -> bool:
    """Check if user is allowed to access a specific folder."""
    if not user:
        return False
    if user.get("role") == "Administrator" or "*" in user.get("abilities", []):
        return True
    allowed_f = user.get("allowed_folders", [])
    if not allowed_f or "*" in allowed_f:  # Empty or "*" means access to all folders
        return True
    clean_target = folder_name.strip().lower()
    return any(f.strip().lower() == clean_target or f.strip() == "*" for f in allowed_f)
