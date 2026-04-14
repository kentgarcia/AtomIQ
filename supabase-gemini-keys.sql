-- Gemini key pool for Supabase Edge Function rotation.
-- Keys in this table are never read directly from client apps.

create table if not exists public.gemini_api_keys (
  id uuid primary key default gen_random_uuid(),
  key_name text not null unique,
  api_key text not null unique,
  purpose text not null default 'chat' check (purpose in ('chat', 'moderation', 'both')),
  is_active boolean not null default true,
  priority integer not null default 100,
  fail_count integer not null default 0,
  request_count bigint not null default 0,
  cooldown_until timestamptz,
  last_error text,
  last_used_at timestamptz,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gemini_api_keys enable row level security;

-- Defense in depth: deny table access to client roles.
revoke all on table public.gemini_api_keys from anon, authenticated;

create index if not exists idx_gemini_api_keys_lookup
  on public.gemini_api_keys (purpose, is_active, priority, fail_count);

create index if not exists idx_gemini_api_keys_cooldown
  on public.gemini_api_keys (cooldown_until);

-- Example inserts:
-- insert into public.gemini_api_keys (key_name, api_key, purpose, priority)
-- values
--   ('gemini-chat-1', 'AIza...', 'chat', 10),
--   ('gemini-chat-2', 'AIza...', 'chat', 20),
--   ('gemini-shared-1', 'AIza...', 'both', 30);
