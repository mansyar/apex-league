-- The global leaderboards. One row per trainer per category holds that
-- trainer's all-time best; a submit only ever raises the value, never lowers
-- it. `name` is the trainer's chosen display label at submit time, so a rename
-- lands on the next submit. `updated_at` is the server's clock at the submit
-- that set the value, which is what orders ties (earliest first). No email, no
-- passphrase, nothing that identifies a person beyond the anonymous id the
-- identity surface already issued.
CREATE TABLE leaderboard_scores (
  trainer_id TEXT NOT NULL REFERENCES trainers (id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  value INTEGER NOT NULL,
  name TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (trainer_id, category)
);

-- The board query filters one category and pages the top of its order, so the
-- index carries exactly that order: highest value first, earliest achievement
-- first among ties, trainer id breaking whatever is left.
CREATE INDEX leaderboard_scores_board ON leaderboard_scores (category, value DESC, updated_at ASC, trainer_id ASC);
