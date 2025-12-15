
-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Identidade Central
CREATE TABLE IF NOT EXISTS public.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_status text, -- active, trailing, past_due
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  couple_id uuid REFERENCES public.couples,
  full_name text,
  role text, -- 'P1' | 'P2'
  monthly_income numeric,
  income_receipt_day integer,
  risk_profile text, -- 'low' | 'medium' | 'high'
  onboarding_completed boolean DEFAULT false,
  avatar_url text
);

-- 2. Tríade de Execução

-- 2.1 Metas (O Sonho)
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES public.couples NOT NULL,
  title text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  deadline timestamptz,
  status text, -- 'in-progress' | 'achieved' | 'paused'
  category text
);

-- 2.2 Tarefas (A Ação)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES public.couples NOT NULL,
  title text NOT NULL,
  assignee_id uuid REFERENCES public.profiles(id),
  deadline timestamptz,
  completed boolean DEFAULT false,
  financial_impact numeric DEFAULT 0,
  priority text,
  linked_goal_id uuid REFERENCES public.goals(id),
  created_at timestamptz DEFAULT now()
);

-- 2.3 Transações (O Resultado Financeiro)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES public.couples NOT NULL,
  user_id uuid REFERENCES public.profiles(id),
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  type text, -- 'income' | 'expense'
  date timestamptz DEFAULT now(),
  status text, -- 'paid' | 'pending'
  linked_task_id uuid REFERENCES public.tasks(id),
  created_at timestamptz DEFAULT now()
);

-- 3. Suporte
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES public.couples NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  type text,
  google_event_id text,
  assignee_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES public.couples NOT NULL,
  symbol text,
  name text,
  quantity numeric,
  purchase_price numeric,
  current_price numeric,
  created_at timestamptz DEFAULT now()
);

-- Security Helper
CREATE OR REPLACE FUNCTION auth.couple_id() RETURNS uuid AS $$
  SELECT couple_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

-- Enable RLS
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

-- Policies

-- Couples: Users can read their own couple
CREATE POLICY "Couples Select" ON public.couples
  FOR SELECT USING (id = auth.couple_id());

-- Profiles: Users can read themselves and their partner (shared couple_id)
CREATE POLICY "Profiles Select" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR couple_id = auth.couple_id()
  );

-- Profiles Update: Users can update only themselves
CREATE POLICY "Profiles Update" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Profiles Insert: Allow users to insert themselves (on signup)
CREATE POLICY "Profiles Insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Tenant Isolation for Data Tables
-- Goals
CREATE POLICY "Tenant Isolation" ON public.goals
  FOR ALL USING (couple_id = auth.couple_id());

-- Tasks
CREATE POLICY "Tenant Isolation" ON public.tasks
  FOR ALL USING (couple_id = auth.couple_id());

-- Transactions
CREATE POLICY "Tenant Isolation" ON public.transactions
  FOR ALL USING (couple_id = auth.couple_id());

-- Events
CREATE POLICY "Tenant Isolation" ON public.events
  FOR ALL USING (couple_id = auth.couple_id());

-- Investments
CREATE POLICY "Tenant Isolation" ON public.investments
  FOR ALL USING (couple_id = auth.couple_id());

