
-- Create user_integrations table for storing third-party tokens (Google, etc.)
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  google_refresh_token text,
  google_access_token text,
  google_token_expiry timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can read/update their own integrations
CREATE POLICY "Integrations Select" ON public.user_integrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Integrations Insert" ON public.user_integrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Integrations Update" ON public.user_integrations
  FOR UPDATE USING (user_id = auth.uid());

-- Service Role can manage all (implicit)
