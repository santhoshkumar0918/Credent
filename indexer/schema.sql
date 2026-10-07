-- Credent attestation graph (prd/Credent-prd.md §11).
-- Read-only mirror of chain events. No plaintext amounts live here either:
-- commitments + statuses only; disclosed values are never persisted.

CREATE TABLE IF NOT EXISTS attesters (
  address         TEXT PRIMARY KEY,
  attester_type   TEXT NOT NULL,
  bond            NUMERIC NOT NULL DEFAULT 0,
  reputation_score INTEGER NOT NULL DEFAULT 0,
  attestation_count INTEGER NOT NULL DEFAULT 0,
  challenges_lost INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attestations (
  id                BIGINT PRIMARY KEY,
  attester          TEXT NOT NULL REFERENCES attesters(address),
  subject_pseudonym TEXT NOT NULL,
  event_type        TEXT NOT NULL,
  commitment_hash   TEXT NOT NULL,
  evidence_hash     TEXT,
  block_number      BIGINT NOT NULL,
  block_timestamp   TIMESTAMPTZ,
  tx_hash           TEXT NOT NULL,
  tx_hash           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_attestations_subject ON attestations(subject_pseudonym);
CREATE INDEX IF NOT EXISTS idx_attestations_attester ON attestations(attester);
CREATE INDEX IF NOT EXISTS idx_attestations_status ON attestations(status);

CREATE TABLE IF NOT EXISTS consents (
  subject_pseudonym TEXT NOT NULL,
  viewer            TEXT NOT NULL,
  scope_tags        TEXT[] NOT NULL,
  expiry            TIMESTAMPTZ NOT NULL,
  revoked           BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_pseudonym, viewer)
);

CREATE TABLE IF NOT EXISTS challenges (
  id              BIGINT PRIMARY KEY,
  attestation_id  BIGINT NOT NULL REFERENCES attestations(id),
  challenger      TEXT NOT NULL,
  challenger_bond NUMERIC NOT NULL,
  window_ends     TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'OPEN',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subscriber cursor: last fully-ingested block (exclusive next start).
CREATE TABLE IF NOT EXISTS indexer_cursor (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  block_number BIGINT NOT NULL
);

-- Rolling migrations for existing databases (idempotent).
ALTER TABLE attestations ADD COLUMN IF NOT EXISTS block_timestamp TIMESTAMPTZ;
