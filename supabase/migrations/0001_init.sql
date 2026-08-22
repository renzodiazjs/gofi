-- GoFI — initial schema.
--
-- Access model: there is no end-user auth yet. Every read and write goes
-- through Next.js route handlers using the Supabase secret key, which bypasses
-- RLS. RLS is still enabled on every table with NO policies, so the tables are
-- unreachable from the browser even if the publishable key leaks. Default-deny,
-- same principle as the WDK guardrails.

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table if not exists public.goals (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  wallet_address      text        not null,
  initial_capital     numeric(20, 6) not null check (initial_capital > 0),
  target_amount       numeric(20, 6) not null check (target_amount > 0),
  time_horizon_months integer     not null check (time_horizon_months between 1 and 120),
  risk_profile        text        not null check (risk_profile in ('conservative', 'moderate', 'aggressive')),
  status              text        not null default 'draft'
                      check (status in ('draft', 'analyzed', 'approved', 'active', 'completed', 'abandoned')),

  constraint goals_target_above_capital check (target_amount > initial_capital)
);

create index if not exists goals_wallet_address_idx on public.goals (wallet_address);
create index if not exists goals_status_idx on public.goals (status);

-- ---------------------------------------------------------------------------
-- strategies — one goal can be analyzed more than once
-- ---------------------------------------------------------------------------
create table if not exists public.strategies (
  id                  bigint generated always as identity primary key,
  created_at          timestamptz not null default now(),

  goal_id             bigint      not null references public.goals (id) on delete cascade,

  required_return_pct numeric(10, 4) not null,
  monthly_return_pct  numeric(10, 4) not null,
  feasibility         text        not null check (feasibility in ('feasible', 'ambitious', 'unrealistic')),
  confidence          text        not null check (confidence in ('low', 'medium', 'high')),
  reasoning           text        not null,
  -- Ordered allocation steps. jsonb, not json: it is queryable and indexable.
  allocations         jsonb       not null default '[]'::jsonb,
  model               text        not null,
  status              text        not null default 'proposed'
                      check (status in ('proposed', 'approved', 'rejected', 'executed'))
);

create index if not exists strategies_goal_id_idx on public.strategies (goal_id);
create index if not exists strategies_status_idx on public.strategies (status);

-- ---------------------------------------------------------------------------
-- guardrails — per goal; mirrors what lib/guardrails compiles into WDK policies
-- ---------------------------------------------------------------------------
create table if not exists public.guardrails (
  id                   bigint generated always as identity primary key,
  created_at           timestamptz not null default now(),

  goal_id              bigint      not null unique references public.goals (id) on delete cascade,

  max_transaction_usd  numeric(20, 6) not null check (max_transaction_usd > 0),
  max_daily_volume_usd numeric(20, 6) not null check (max_daily_volume_usd > 0),
  allowed_assets       text[]      not null default array['USDT', 'ETH'],
  allowed_protocols    text[]      not null default array[]::text[],
  require_confirmation boolean     not null default true,

  constraint guardrails_daily_covers_single check (max_daily_volume_usd >= max_transaction_usd)
);

-- ---------------------------------------------------------------------------
-- transactions — on-chain audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id                bigint generated always as identity primary key,
  created_at        timestamptz not null default now(),

  goal_id           bigint      references public.goals (id) on delete set null,
  strategy_id       bigint      references public.strategies (id) on delete set null,

  hash              text        not null unique,
  network           text        not null,
  chain_id          integer     not null,
  sender            text        not null,
  recipient         text        not null,
  asset             text        not null,
  amount            numeric(20, 6) not null,
  -- Base units exceed bigint range for 18-decimal assets, so keep them as text.
  amount_base_units text        not null,
  fee               numeric(30, 18) not null,
  fee_symbol        text        not null,
  status            text        not null default 'pending'
                    check (status in ('pending', 'confirmed', 'failed'))
);

create index if not exists transactions_goal_id_idx on public.transactions (goal_id);
create index if not exists transactions_strategy_id_idx on public.transactions (strategy_id);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Security: RLS on, zero policies, no grants to public roles.
-- Only the secret key (service_role, BYPASSRLS) can reach these tables.
-- ---------------------------------------------------------------------------
alter table public.goals        enable row level security;
alter table public.strategies   enable row level security;
alter table public.guardrails   enable row level security;
alter table public.transactions enable row level security;

alter table public.goals        force row level security;
alter table public.strategies   force row level security;
alter table public.guardrails   force row level security;
alter table public.transactions force row level security;

revoke all on public.goals        from anon, authenticated;
revoke all on public.strategies   from anon, authenticated;
revoke all on public.guardrails   from anon, authenticated;
revoke all on public.transactions from anon, authenticated;

grant all on public.goals        to service_role;
grant all on public.strategies   to service_role;
grant all on public.guardrails   to service_role;
grant all on public.transactions to service_role;
