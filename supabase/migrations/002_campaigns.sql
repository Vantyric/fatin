-- ==============================================================================
-- Migration 002: Privacy-Preserving Campaign Memory Tables
-- ==============================================================================

-- 1. Campaigns Table: Stores SimHash fingerprints & LSH bands only (NO message text)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    band1 TEXT NOT NULL,
    band2 TEXT NOT NULL,
    band3 TEXT NOT NULL,
    band4 TEXT NOT NULL,
    simhash TEXT NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_count INTEGER NOT NULL DEFAULT 1,
    scam_count INTEGER NOT NULL DEFAULT 0
);

-- Index LSH bands for fast candidate lookup
CREATE INDEX IF NOT EXISTS idx_campaigns_band1 ON public.campaigns (band1);
CREATE INDEX IF NOT EXISTS idx_campaigns_band2 ON public.campaigns (band2);
CREATE INDEX IF NOT EXISTS idx_campaigns_band3 ON public.campaigns (band3);
CREATE INDEX IF NOT EXISTS idx_campaigns_band4 ON public.campaigns (band4);
CREATE INDEX IF NOT EXISTS idx_campaigns_simhash ON public.campaigns (simhash);

-- Enable RLS (Service role only, no public access)
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 2. Domains Seen Table: Tracks domain frequency and scam ratio
CREATE TABLE IF NOT EXISTS public.domains_seen (
    domain TEXT PRIMARY KEY,
    seen_count INTEGER NOT NULL DEFAULT 1,
    scam_count INTEGER NOT NULL DEFAULT 0,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_domains_seen_scam ON public.domains_seen (scam_count);

ALTER TABLE public.domains_seen ENABLE ROW LEVEL SECURITY;
