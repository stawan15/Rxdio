-- D1 schema for favorites and playlists.
-- user_id is an opaque string: whatever your auth puts in the token's `sub` claim.

CREATE TABLE favorites (
    user_id TEXT NOT NULL,
    station_id TEXT NOT NULL,
    station_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, station_id)
);

CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX playlists_user_idx ON playlists (user_id);

CREATE TABLE playlist_stations (
    playlist_id TEXT NOT NULL REFERENCES playlists (id) ON DELETE CASCADE,
    station_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (playlist_id, station_id)
);
