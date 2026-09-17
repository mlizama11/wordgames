CREATE TABLE IF NOT EXISTS daily_clues (
  clue_date DATE PRIMARY KEY,
  clue TEXT NOT NULL,
  answer TEXT NOT NULL CHECK (answer = UPPER(answer)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_clue_completions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clue_date DATE NOT NULL REFERENCES daily_clues(clue_date) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, clue_date)
);

INSERT INTO daily_clues (clue_date, clue, answer)
VALUES ('2026-09-16', 'A fragrant herb that makes a cool drink feel fancy.', 'MINT')
ON CONFLICT (clue_date) DO NOTHING;