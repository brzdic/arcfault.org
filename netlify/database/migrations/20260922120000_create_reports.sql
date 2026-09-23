-- One row per nuisance trip report.
-- Public pages only ever see rows with status = 'published', and only the safe columns.
CREATE TABLE reports (
  id              SERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),

  -- Private contact details (admin only)
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  street          TEXT NOT NULL,
  town            TEXT NOT NULL,
  state           CHAR(2) NOT NULL,
  zip             TEXT NOT NULL,
  lat             DOUBLE PRECISION,
  lon             DOUBLE PRECISION,

  -- The trip
  trip_date       DATE NOT NULL,
  frequency       TEXT NOT NULL,
  brand           TEXT NOT NULL,
  breaker_type    TEXT,
  appliance       TEXT NOT NULL,
  fix             TEXT,
  story           TEXT NOT NULL,

  -- Losses
  food_loss       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  property_loss   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  property_desc   TEXT,
  injury          BOOLEAN NOT NULL DEFAULT FALSE,
  injury_desc     TEXT,

  -- Verification
  electrician     TEXT,
  license         TEXT,

  -- Privacy and contact
  display_choice  TEXT NOT NULL CHECK (display_choice IN ('initials', 'anon')),
  consent         BOOLEAN NOT NULL,
  newsletter      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Set by the admin when approving
  public_summary  TEXT,
  published_at    TIMESTAMPTZ
);

CREATE INDEX reports_status_idx ON reports (status);
CREATE INDEX reports_state_idx ON reports (state);
