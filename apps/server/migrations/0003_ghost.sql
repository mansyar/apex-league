-- One ghost per trainer: the latest uploaded cup-winning replay bundle, stored
-- as opaque text. Unlike the leaderboard there is no value to raise — the
-- newest upload is the per-trainer best by definition, so an upload replaces
-- the row outright. `name` is the trainer's display label at upload time, so
-- a rename lands on the next upload. `updated_at` is the server's clock at
-- the upload that wrote the row, which is what orders the board (newest
-- first). No email, no passphrase, nothing that identifies a person beyond the
-- anonymous id the identity surface already issued and the label the trainer
-- chose.
CREATE TABLE ghost_bests (
  trainer_id TEXT PRIMARY KEY NOT NULL REFERENCES trainers (id) ON DELETE CASCADE,
  payload TEXT NOT NULL,
  name TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- The board query pages the newest uploads first, so the index carries exactly
-- that order: latest achievement first, trainer id breaking whatever is left.
CREATE INDEX ghost_bests_board ON ghost_bests (updated_at DESC, trainer_id ASC);
