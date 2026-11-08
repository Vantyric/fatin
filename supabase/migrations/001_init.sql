-- ==============================================================================
-- Migration: 001_init.sql
-- Project: "فَطِن" (Fatin) - Arabic Scam Checker PWA for Iraq
-- ==============================================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  save_history BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, plan, save_history)
  VALUES (new.id, 'free', false)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Checks Table (Saved ONLY if save_history is enabled by user)
CREATE TABLE IF NOT EXISTS public.checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'link', 'image')),
  verdict TEXT NOT NULL CHECK (verdict IN ('safe', 'suspicious', 'scam')),
  risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  scam_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  masked_excerpt VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checks"
  ON public.checks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checks"
  ON public.checks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checks"
  ON public.checks
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Usage Table (Strictly server-side rate limiting)
CREATE TABLE IF NOT EXISTS public.usage (
  day DATE NOT NULL,
  subject TEXT NOT NULL,
  count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (day, subject)
);

ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;
-- No public policies on usage table; only accessed via service-role / security-definer RPC

-- Atomic increment usage RPC
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_day DATE,
  p_subject TEXT,
  p_limit INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current INT;
  v_allowed BOOLEAN;
  v_remaining INT;
BEGIN
  -- Insert or increment count
  INSERT INTO public.usage (day, subject, count)
  VALUES (p_day, p_subject, 1)
  ON CONFLICT (day, subject)
  DO UPDATE SET count = public.usage.count + 1
  RETURNING count INTO v_current;

  IF v_current <= p_limit THEN
    v_allowed := true;
    v_remaining := p_limit - v_current;
  ELSE
    v_allowed := false;
    v_remaining := 0;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'current_count', v_current
  );
END;
$$;

-- Revoke RPC execution from anonymous and authenticated roles; call only with service role
REVOKE EXECUTE ON FUNCTION public.increment_usage(DATE, TEXT, INT) FROM PUBLIC, anon, authenticated;

-- 4. Feedback Table (Server-side anonymous feedback, no user messages)
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verdict TEXT NOT NULL CHECK (verdict IN ('safe', 'suspicious', 'scam')),
  helpful BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
-- No public policies; inserted server-side with service-role
