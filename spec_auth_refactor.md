# Especificação de Refatoração: Autenticação & Onboarding (Master Spec)

## 1. Schema Definition (Supabase SQL)

Este esquema define a estrutura fundamental para suportar fluxos de pagamento (Stripe) e integrações seguras (Google Calendar).

### 1.1 Tables

```sql
-- couples: Núcleo familiar (Criação restrita a Webhooks/Admin)
CREATE TABLE IF NOT EXISTS public.couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text, -- Pode ser null inicialmente, preenchido no onboarding
  stripe_customer_id text,
  stripe_subscription_id text, -- NOVO: Rastreio da assinatura
  subscription_status text DEFAULT 'inactive', -- 'active', 'trialing', 'past_due', 'canceled'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- profiles: Dados do usuário estendidos
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id uuid REFERENCES public.couples(id),
  full_name text,
  email text, -- Sincronizado com auth.users via Trigger
  role text CHECK (role IN ('P1', 'P2')),
  
  -- Dados Financeiros (Onboarding)
  monthly_income numeric DEFAULT 0,
  income_receipt_day integer CHECK (income_receipt_day BETWEEN 1 AND 31),
  risk_profile text CHECK (risk_profile IN ('low', 'medium', 'high')),
  
  -- Controle de Estado
  onboarding_completed boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- invites: Convites para P2
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES public.couples(id) NOT NULL,
  email text, -- Email do convidado (opcional se for link genérico)
  token text NOT NULL UNIQUE, -- Token gerado via crypto
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days')
);

-- user_integrations: Tabela Segregada para Tokens Sensíveis
CREATE TABLE IF NOT EXISTS public.user_integrations (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  google_refresh_token text, -- TOKEN SENSÍVEL
  google_calendar_primary_id text,
  updated_at timestamptz DEFAULT now()
);
```

### 1.2 Indexes
*   `IDX_profiles_couple_id` ON `public.profiles(couple_id)`
*   `IDX_invites_token` ON `public.invites(token)`

---

## 2. Matriz de Segurança (RLS Policies)

### 2.1 Regra de Ouro (Couples)
> **CRÍTICO:** O Frontend **NUNCA** pode fazer `INSERT` em `couples`. A criação de um casal é exclusiva do Backend (Webhook do Stripe ou Edge Function de Invite).

**Policies para `couples`:**
*   **SELECT:** `auth.uid() IN (SELECT id FROM profiles WHERE couple_id = couples.id)` (Ver seu próprio casal).
*   **INSERT:** `false` (Ninguém via Client API). *Service Role Only.*
*   **UPDATE:** `auth.uid() IN (SELECT id FROM profiles WHERE couple_id = couples.id)` (Renomear casal, etc).

### 2.2 Profiles
*   **SELECT:** `(id = auth.uid()) OR (couple_id IS NOT NULL AND couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))` (Ver a si mesmo e ao parceiro).
*   **UPDATE:** `id = auth.uid()` (Editar apenas seu próprio perfil).
*   **INSERT:** `id = auth.uid()` (Criar seu próprio perfil no Signup - *Idealmente via Trigger, mas permitido para robustness*).

### 2.3 User Integrations (Google Tokens)
> **Proteção de Leitura:** Dados sensíveis isolados.

*   **SELECT:** `user_id = auth.uid()` (Apenas o dono vê seus tokens).
*   **INSERT/UPDATE:** `user_id = auth.uid()` (Dono pode conectar/atualizar).

---

## 3. Mapeamento de Fluxos (State Machine)

### 3.1 Fluxo P1: O Pagante (Fundador)
1.  **Landing Page:** Usuário clica em "Começar Agora".
2.  **Signup:** Cria conta no Supabase Auth.
3.  **App Guard (Middleware):** Detecta `role=P1` E `!subscription_status`. Redireciona para `/checkout`.
4.  **Stripe Checkout:** Frontend avança para Stripe Link (Client Reference ID = `user_id`).
5.  **Pagamento Sucesso:** Stripe redireciona para `/processing` -> `/onboarding`.
6.  **Webhook (Backend Async):**
    *   Recebe `checkout.session.completed`.
    *   Cria registro em `couples` (role: service_role).
    *   Atualiza `profiles` do usuário com `couple_id` e `role='P1'`.
7.  **Onboarding:** Frontend faz polling ou realtime detecta update no profile. Libera acesso ao Wizard (Nome do Casal -> Renda -> Risco -> Google Auth).

### 3.2 Fluxo P2: O Convidado
1.  **Convite:** Recebe Link `app.gossipcouple.com/invite?token=XYZ`.
2.  **Invite Landing:** Valida token via Edge Function `validate-invite`. Mostra "Convidado por [Nome P1]".
3.  **Signup/Login:** Cria conta ou Loga.
4.  **Associação (Edge Function):**
    *   Front chama `join-couple` (com token).
    *   Backend valida token, busca `couple_id`, atualiza `profiles` do usuário (set `couple_id`, `role='P2'`).
    *   Atualiza status do invite para `accepted`.
5.  **Onboarding:** Simplificado (Pula pagamento e criação de casal). Foca em: Renda -> Google Auth.

### 3.3 Componentes & Hooks (Clean Up)

**Deletar/Deprecar:**
*   `src/components/CheckoutMock.tsx` (Lixo).
*   Lógica de `INITIAL_STATE` em `App.tsx`.
*   Checagens manuais de `if (!coupleId)` espalhas pelo código.

**Novos Hooks Core:**
1.  `useAuthSession()`: Gerencia User User, Loading state.
2.  `useUserContext()`: Retorna `{ profile, couple, subscriptionStatus, isP1, isP2 }`.
3.  `useOnboardingGuard()`: Redireciona usuário baseado na flag `onboarding_completed`.

---

## 4. Definição de Edge Functions (Deno/Supabase)

### 4.1 `stripe-webhook`
*   **Trigger:** HTTP POST (Stripe).
*   **Input:** Stripe Event Object (Assinado).
*   **Lógica:**
    *   Verificar assinatura.
    *   Se `checkout.session.completed`: Ler `client_reference_id` (User ID).
    *   Criar row em `couples`.
    *   Update `profiles` com `couple_id` e `stripe_customer_id`.
    *   (Opcional) Enviar email de boas-vindas.

### 4.2 `invite-manager`
*   **Trigger:** RPC ou HTTP.
*   **Ações:**
    *   `create_invite(email?)`: Gera token, insere em `invites`. Retorna URL.
    *   `validate_invite(token)`: Checa validade e expiração. Retorna info do casal (nome).
    *   `join_couple(token)`: Vincula usuário autenticado ao casal do token.

### 4.3 `google-auth-callback` (Opcional, se não usar client-side flow)
*   **Idealmente:** Troca code por tokens no backend para garantir que `refresh_token` seja salvo direto em `user_integrations` sem transitar exposto no cliente (embora client-flow com RLS estrito seja aceitável para MVP).

---

## 5. Plano de Execução MCP

Ferramentas a serem utilizadas pelo Agente para aplicar este plano:

1.  **Schema Migration:**
    *   `mcp_supabase_execute_sql`: Para criar tabelas `couples`, `invites`, `user_integrations` e aplicar Policies.
    *   *Nota:* Executar scripts em ordem de dependência.

2.  **Configuração Stripe:**
    *   `mcp_stripe`:
        *   `create_product`: "Gossip Couple Premium".
        *   `create_price`: R$ 29,90/mês.
        *   `create_payment_link` (ou usar Checkout Sessions via API no front).

3.  **Edge Functions Deploy:**
    *   `run_command`: `supabase functions change/deploy`.
