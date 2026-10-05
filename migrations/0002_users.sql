-- Accounts. The browser stretches the password (PBKDF2, 600k rounds) and sends only the derived key;
-- key_hash is SHA-256 of that key, so a leaked table cannot be used to sign in.
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Fixed-window counters for sign-in / sign-up throttling
CREATE TABLE rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL,
    reset_at INTEGER NOT NULL
);
