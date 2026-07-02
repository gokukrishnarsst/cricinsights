CREATE TABLE waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT waitlist_email_unique UNIQUE (email)
);

CREATE INDEX idx_waitlist_created_at ON waitlist (created_at DESC);
