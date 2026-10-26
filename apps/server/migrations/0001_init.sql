-- The schema the server owns. Migrations are committed SQL rather than
-- generated journals so that what runs in production is exactly what is
-- reviewed here.

-- Trainers are anonymous: `id` is an opaque server-generated token, the name is
-- a display label, and the passphrase exists only as a salted hash. No email,
-- no recovery address, nothing that identifies a person.
CREATE TABLE trainers (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  passphrase_hash TEXT NOT NULL,
  passphrase_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Exactly one save per trainer. `payload` is opaque text: the server never
-- parses the client's save schema, so a save written by a newer client than
-- this server round trips untouched. `saved_at` is the client's clock (the
-- ordering authority); `received_at` is the server's, recorded for diagnosis.
CREATE TABLE saves (
  trainer_id TEXT PRIMARY KEY NOT NULL REFERENCES trainers (id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);

-- The losing side of a save conflict, kept so the player can recover it rather
-- than having it silently overwritten.
CREATE TABLE displaced_saves (
  trainer_id TEXT PRIMARY KEY NOT NULL REFERENCES trainers (id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  saved_at INTEGER NOT NULL,
  displaced_at INTEGER NOT NULL
);
