-- Migration 001_initial_schema.sql
-- Source: Igbo Community Atlas Specification v1.0

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. ENUMS AND DOMAINS
DO $$ BEGIN
    CREATE TYPE community_type AS ENUM (
        'village',
        'town',
        'city',
        'settlement',
        'community',
        'historical_settlement'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE identity_status_type AS ENUM (
        'igbo',
        'mixed',
        'historically_igbo',
        'igbo_associated',
        'uncertain',
        'disputed',
        'not_igbo'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status_type AS ENUM (
        'pending',
        'under_review',
        'verified',
        'challenged',
        'archived'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE evidence_source_type AS ENUM (
        'community_submission',
        'community_confirmation',
        'academic_source',
        'historical_source',
        'linguistic_source',
        'government_source',
        'archival_source',
        'oral_history',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'contributor',
        'moderator',
        'admin'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'contributor',
    account_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ADMINISTRATIVE REFERENCE TABLES
CREATE TABLE IF NOT EXISTS states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin1_pcod TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    reference_name TEXT,
    alternate_name TEXT,
    admin0_pcod TEXT DEFAULT 'NG',
    admin0_name TEXT DEFAULT 'Nigeria',
    source_date TEXT,
    valid_on TEXT,
    valid_to TEXT,
    shape_length NUMERIC,
    shape_area NUMERIC,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lgas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin2_pcod TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    reference_name TEXT,
    alternate_name TEXT,
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    admin1_pcod TEXT NOT NULL,
    admin0_pcod TEXT DEFAULT 'NG',
    admin0_name TEXT DEFAULT 'Nigeria',
    source_date TEXT,
    valid_on TEXT,
    valid_to TEXT,
    shape_length NUMERIC,
    shape_area NUMERIC,
    geom geometry(MultiPolygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial & relation indexes for administrative geography
CREATE INDEX IF NOT EXISTS idx_states_geom ON states USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_lgas_geom ON lgas USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_lgas_state_id ON lgas (state_id);
CREATE INDEX IF NOT EXISTS idx_lgas_admin1_pcod ON lgas (admin1_pcod);

-- 4. COMMUNITIES
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type community_type NOT NULL DEFAULT 'community',
    description TEXT,
    location geometry(Point, 4326) NOT NULL,
    state_id UUID NOT NULL REFERENCES states(id) ON DELETE RESTRICT,
    lga_id UUID NOT NULL REFERENCES lgas(id) ON DELETE RESTRICT,
    identity_status identity_status_type NOT NULL DEFAULT 'igbo',
    language_status TEXT,
    historical_status TEXT,
    verification_status verification_status_type NOT NULL DEFAULT 'pending',
    confidence NUMERIC(3, 2) DEFAULT 0.50 CHECK (confidence >= 0.0 AND confidence <= 1.0),
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communities_location ON communities USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_communities_state_id ON communities (state_id);
CREATE INDEX IF NOT EXISTS idx_communities_lga_id ON communities (lga_id);
CREATE INDEX IF NOT EXISTS idx_communities_verification_status ON communities (verification_status);
CREATE INDEX IF NOT EXISTS idx_communities_identity_status ON communities (identity_status);
CREATE INDEX IF NOT EXISTS idx_communities_name ON communities (name);

-- 5. SUPPORTING TABLES

-- Community Aliases
CREATE TABLE IF NOT EXISTS community_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    alias_name TEXT NOT NULL,
    name_type TEXT DEFAULT 'alternate', -- alternate, historical, dialect
    language_or_dialect TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_community_aliases_comm_id ON community_aliases (community_id);
CREATE INDEX IF NOT EXISTS idx_community_aliases_name ON community_aliases (alias_name);

-- Community Evidence
CREATE TABLE IF NOT EXISTS community_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    source_type evidence_source_type NOT NULL,
    citation_or_url TEXT,
    description TEXT NOT NULL,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_community_id ON community_evidence (community_id);

-- Community Confirmations
CREATE TABLE IF NOT EXISTS community_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_confirmations_comm_id ON community_confirmations (community_id);

-- Community Challenges
CREATE TABLE IF NOT EXISTS community_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    challenged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    evidence_url TEXT,
    status TEXT NOT NULL DEFAULT 'open', -- open, resolved, dismissed
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenges_comm_id ON community_challenges (community_id);

-- Community Revisions (Audit log of substantive changes)
CREATE TABLE IF NOT EXISTS community_revisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_revisions_comm_id ON community_revisions (community_id);

-- Community Photos / Media
CREATE TABLE IF NOT EXISTS community_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    caption TEXT,
    attribution TEXT NOT NULL,
    license TEXT NOT NULL DEFAULT 'CC-BY-4.0',
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_photos_comm_id ON community_photos (community_id);
