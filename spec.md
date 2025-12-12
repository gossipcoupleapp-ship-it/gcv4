# Gossip Couple App - PWA Migration Specification
**Status:** DRAFT
**Version:** 1.0

This document serves as the **Single Source of Truth** for migrating the Gossip Couple frontend prototype to a production-grade Agentic PWA backed by Supabase and Google Calendar.

---

## 1. User Stories & Core Flows

### 1.1 The "Triad of Execution" (Unified Data Flow)
A key differentiator is the tight coupling between Tasks, Finances, and Time.
- **Trigger:** User creates a Task (e.g., "Renew Car Insurance").
- **System Action:**
  1.  **Task Record:** Created in `tasks` table.
  2.  **Shadow Transaction:** If `financial_impact` > 0, system creates a `transactions` record with `status='pending'` and `type='expense'`.
  3.  **Calendar Event:** System creates an `events` record (and syncs to Google Calendar) for the task deadline.
- **Completion:**
  - When User checks off the Task, they are prompted: "Did this cost $X as planned?"
  - If "Yes": `transactions.status` -> `'paid'`.
  - If "No": Transaction is deleted or updated.

### 1.2 Onboarding Flow
- **Partner 1 (The Initiator):**
  1.  **Landing Page:** Clicks "Get Started".
  2.  **Auth:** Sign up via Google (Supabase Auth).
  3.  **Payment:** Stripe Checkout (Subscription).
  4.  **Setup:** Sets `couple_name` and `risk_profile`.
  5.  **Dashboard:** Land on main app.
  6.  **Invite:** Generates a magic link for P2.

- **Partner 2 (The Invitee):**
  1.  **Link Entry:** Opens Invite Link.
  2.  **Auth:** Sign up via Google.
  3.  **Association:** System detects token, adds P2 to P1's `couple_id`.
  4.  **Sync:** Prompts to connect Google Calendar.
  5.  **Dashboard:** Accesses shared view.

---

## 2. Data Model (Supabase Schema)

All tables must include `created_at` (timestamptz) and `updated_at` (timestamptz).

### 2.1 Tables

```sql
-- 1. Couples (Tenant)
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled'
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles (Users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  couple_id UUID REFERENCES couples(id),
  role TEXT CHECK (role IN ('P1', 'P2')),
  full_name TEXT,
  email TEXT UNIQUE,
  monthly_income NUMERIC(12, 2) DEFAULT 0,
  income_receipt_day INT CHECK (income_receipt_day BETWEEN 1 AND 31),
  calendar_sync_token TEXT, -- Encrypted Google Refresh Token
  avatar_url TEXT,
  risk_profile TEXT CHECK (risk_profile IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions (Financials)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  user_id UUID REFERENCES profiles(id), -- Who paid/received
  amount NUMERIC(12, 2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')),
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'paid',
  linked_task_id UUID, -- For Shadow Transactions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Goals (Dreams)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL,
  current_amount NUMERIC(12, 2) DEFAULT 0,
  deadline DATE,
  status TEXT CHECK (status IN ('in-progress', 'achieved', 'paused')),
  category TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tasks (Execution)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  assignee_id UUID REFERENCES profiles(id), -- Nullable = 'both'
  deadline TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  financial_impact NUMERIC(12, 2), -- Optional cost associated
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  linked_goal_id UUID REFERENCES goals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Events (Time)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('finance', 'social', 'work', 'task')),
  google_event_id TEXT, -- For 2-way sync
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Investments (Assets)
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12, 4) NOT NULL,
  purchase_price NUMERIC(12, 2),
  current_price NUMERIC(12, 2), -- Updated via tool/job
  type TEXT CHECK (type IN ('stock', 'crypto', 'etf', 'reit')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Security (RLS)
- **Policy:** Users can ONLY SELECT/INSERT/UPDATE/DELETE rows where `couple_id` matches the `couple_id` found in their `profiles` record.
- **Helper Function:**
  ```sql
  CREATE FUNCTION auth.couple_id() RETURNS UUID AS $$
    SELECT couple_id FROM public.profiles WHERE id = auth.uid()
  $$ LANGUAGE sql STABLE;
  ```
- **Example Policy (Transactions):**
  ```sql
  CREATE POLICY "Couple Isolation" ON transactions
  USING (couple_id = auth.couple_id())
  WITH CHECK (couple_id = auth.couple_id());
  ```

---

## 3. PWA & Offline Strategy

### 3.1 Service Worker (Workbox)
- **Framework:** Vite PWA Plugin.
- **Caching Strategy:**
  1.  **Static Assets (JS, CSS, Fonts, Images):** `Stale-While-Revalidate`. Fast load, background update.
  2.  **API Data (Supabase Reads):** `Network-First`. Try to fetch fresh data; if offline, user cached JSON from previous session.
  3.  **External APIs (Google Calendar):** `Network-Only`. Do not cache sensitive external user data on client heavily.

### 3.2 Offline Capabilities
- **Read:** User can view Dashboard, synced transactions, and tasks while offline.
- **Write:** Optimistic UI updates. Mutations are queued (e.g., using TanStack Query `mutationCache` or `redux-offline` pattern) and replayed when connection is restored.

### 3.3 Manifest (`manifest.json`)
```json
{
  "name": "Gossip Couple - AI Finance",
  "short_name": "GossipCouple",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "icons": [
    { "src": "/pwa-192x192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/pwa-512x512.png", "type": "image/png", "sizes": "512x512" }
  ]
}
```

---

## 4. MCP Integration Strategy

To materialize this infrastructure, we will use the following MCP tools:

1.  **`run_query` (Postgres/Supabase):** To execute the DDL statements for creating tables and RLS policies defined in Section 2.
2.  **`read_file` / `write_file` (Filesystem):** To read the local schema files and write the migration logs.
3.  **`manage_rls` (Custom/Generic):** To explicitly apply and verify Row Level Security policies to ensure tenant isolation.

---
**Approval Required:** Please review the Schema and Flows before we proceed to implementation.
