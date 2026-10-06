-- Applied on every start; every statement is safe to run again.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  dept TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'employee',
  picture TEXT,
  birthday_month SMALLINT,
  birthday_day SMALLINT,
  joined_on TEXT,
  celebrate_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  short TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL,
  duration_pending BOOLEAN NOT NULL DEFAULT FALSE,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  theme SMALLINT NOT NULL DEFAULT 0,
  youtube TEXT,
  video_label TEXT,
  video_key TEXT,
  file_name TEXT,
  chapters JSONB NOT NULL DEFAULT '[]',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by INTEGER REFERENCES users(id),
  removed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ranges JSONB NOT NULL DEFAULT '[]',
  pos REAL NOT NULL DEFAULT 0,
  pct SMALLINT NOT NULL DEFAULT 0,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_at_idx ON events (at);

-- Email sign-in codes. Only a keyed hash of each code is stored.
CREATE TABLE IF NOT EXISTS login_codes (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS login_codes_email_idx ON login_codes (email);

-- One row per wish sent, so the daily job never emails the same celebration twice.
CREATE TABLE IF NOT EXISTS celebration_sends (
  day TEXT NOT NULL,
  key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (day, key)
);
