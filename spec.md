
# Especificação Técnica: Gossip Couple/Sync

**Documento Mestre (Spec)**
**Data:** 12/12/2025
**Status:** Diagnóstico Concluído / Pronto para Refatoração

---

## 1. Status Atual (Diagnóstico de Arquitetura)

O sistema encontra-se funcional em termos de UI, mas híbrido em sua lógica de dados e vulnerável em integrações.

### 1.1 Frontend (UI/UX)
*   **Componentes:** A interface (`App.tsx`, `Dashboard.tsx`, etc.) está robusta e estilizada.
*   **Estado:** A aplicação ainda carrega lógica pesada de gerenciamento de estado ("God Component") em `App.tsx`.
*   **Mock Data:** Os objetos de estado inicial (`INITIAL_STATE`) foram substituídos por chamadas Supabase, mas a tipagem ainda carrega vestígios de estruturas locais não-normalizadas.
*   **PWA:** `manifest.json` existe, mas **não há Service Worker** ativo. A aplicação não funciona offline.

### 1.2 Backend (Supabase)
*   **Conexão:** Estabelecida (Project: `gossip-couple` / Ref: `fjiurznodfyhxzmqnkcc`).
*   **Schema:** Tabelas essenciais existem, mas falta rigor na tipagem de `jsonb` e relacionamentos.
*   **Segurança (RLS):**
    *   ✅ Tenant Isolation implementado (`couple_id = couple_id()`).
    *   ✅ Acesso cross-partner implementado em `profiles`.
    *   ✅ Políticas padrão de `INSERT/SELECT/UPDATE` ativas.

### 1.3 Integrações (Serviços)
*   **Gemini AI:** ⚠️ **CRÍTICO.** A implementação atual (`geminiService.ts`) roda no cliente e expõe a `VITE_GEMINI_API_KEY`. Precisa ser migrada para Edge Functions.
*   **Google Calendar:** A lógica de sincronização (`calendarService.ts`) tenta chamadas diretas à API do Google via cliente. Isso deve ser intermediado pelo backend para garantir persistência e renovação segura de tokens.

---

## 2. Schema Database Definitivo

A estrutura abaixo valida e normaliza o que encontramos no banco, estabelecendo a "Tríade de Execução" (Tarefa ↔ Transação ↔ Meta).

### 2.1 Tabelas Core
```sql
-- Identidade Central
TABLE couples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subscription_status text, -- active, trailing, past_due
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  couple_id uuid REFERENCES couples,
  full_name text,
  role text, -- 'P1' | 'P2'
  monthly_income numeric,
  income_receipt_day integer,
  risk_profile text, -- 'low' | 'medium' | 'high'
  onboarding_completed boolean DEFAULT false,
  avatar_url text
);
```

### 2.2 Tríade de Execução
```sql
-- 1. Metas (O Sonho)
TABLE goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples NOT NULL,
  title text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  deadline timestamptz,
  status text, -- 'in-progress' | 'achieved' | 'paused'
  category text
);

-- 2. Tarefas (A Ação)
TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples NOT NULL,
  title text NOT NULL,
  assignee_id uuid REFERENCES profiles(id), -- Quem executa
  deadline timestamptz,
  completed boolean DEFAULT false,
  financial_impact numeric DEFAULT 0, -- Custo da tarefa (ex: pagar conta)
  priority text,
  linked_goal_id uuid REFERENCES goals(id) -- Conexão com o Sonho
);

-- 3. Transações (O Resultado Financeiro)
TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples NOT NULL,
  user_id uuid REFERENCES profiles(id), -- Quem pagou
  amount numeric NOT NULL,
  category text NOT NULL,
  description text,
  type text, -- 'income' | 'expense'
  date timestamptz DEFAULT now(),
  status text, -- 'paid' | 'pending'
  linked_task_id uuid REFERENCES tasks(id) -- Rastreabilidade da ação
);
```

### 2.3 Suporte
```sql
TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples NOT NULL,
  title text NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  type text,
  google_event_id text,
  assignee_id uuid REFERENCES profiles(id)
);

TABLE investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid REFERENCES couples NOT NULL,
  symbol text,
  name text,
  quantity numeric,
  purchase_price numeric,
  current_price numeric
);
```

---

## 3. Plano de Migração (Refatoração)

### Fase 1: Desacoplamento (`hooks/`)
Reduzir a complexidade do `App.tsx` movendo lógica para custom hooks.

1.  **`useAuth`**: Gerencia sessão, profile e redirecionamento de rotas (Guards).
2.  **`useSyncData`**: Substitui o `useEffect` gigante. Inscreve-se em canais Realtime do Supabase para manter `transactions`, `tasks`, etc., sempre sincronizados.
3.  **`useCouple`**: Expõe dados compartilhados (`coupleName`, `riskTolerance`).

### Fase 2: Segurança de Integração (`edge-functions/`)
1.  **Criar `supabase/functions/chat-transport`**: Recebe o prompt do usuário, injeta o contexto financeiro (RAG) no servidor (seguro) e chama a API do Gemini. Retorna apenas a resposta/JSON.
    *   *Benefício:* A `VITE_GEMINI_API_KEY` sai do frontend.
2.  **Refatorar `services/geminiService.ts`**: Passa a ser apenas um wrapper que faz `POST` para essa Edge Function.

---

## 4. Estratégia PWA (Offline-First)

Implementação via `vite-plugin-pwa`.

### 4.1 Configuração Service Worker
*   **Estratégia:** `NetworkFirst` (prioriza dados frescos, cai para cache se offline) para rotas de API (`/rest/v1/*`).
*   **Estratégia:** `StaleWhileRevalidate` para assets estáticos (JS, CSS, Imagens).
*   **Cache:** `workbox-precaching` para a Shell da aplicação (index.html, manifest).

### 4.2 Arquitetura de Sincronização
Para garantir funcionamento offline sem conflitos complexos nesta fase v4:
1.  **Leitura:** Cache local do Service Worker permite visualizar o Dashboard offline.
2.  **Escrita:** Bloquear ações de escrita (criar transação/tarefa) se `navigator.onLine === false`, mostrando alerta amigável "Você está offline. Reconecte para salvar.".
    *   *Futuro (v5):* Implementar `BackgroundSync` com fila IndexedDB.

---

## 5. Segurança (RLS & Policies)

Mantemos e reforçamos o modelo atual.

1.  **Tenant Isolation (Mandatório):**
    *   Todas as tabelas de dados (`transactions`, `goals`, etc.) devem ter:
        `CREATE POLICY "Tenant Isolation" ON table USING (couple_id = auth.couple_id());`
        *(Nota: `auth.couple_id()` é uma função helper personalizada já existente ou a ser criada para extrair o ID do JWT ou perfil)*.

2.  **Profile Privacy:**
    *   `profiles`: Usuário vê a si mesmo E ao parceiro.
    *   Policy: `(id = auth.uid()) OR (couple_id IN (SELECT couple_id FROM profiles WHERE id = auth.uid()))`

3.  **Edge Functions:**
    *   Validar sempre o JWT do usuário.
    *   Nunca confiar em dados de ID passados no corpo da requisição (`req.body.user_id`), usar sempre `auth.uid()` do contexto.
