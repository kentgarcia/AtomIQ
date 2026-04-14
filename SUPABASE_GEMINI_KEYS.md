# Supabase Gemini Key Pool Setup

This project now routes AI chat through the `gemini-chat` Supabase Edge Function.
Gemini keys are stored server-side in `public.gemini_api_keys` and rotated automatically.

## What Was Added

- Table: `public.gemini_api_keys`
- Edge Function: `gemini-chat`
- App chat service now calls `supabase.functions.invoke('gemini-chat')`

## Add Multiple Gemini Keys

Run this in Supabase SQL Editor (replace values with your real keys):

```sql
insert into public.gemini_api_keys (key_name, api_key, purpose, priority)
values
  ('gemini-chat-1', 'AIza...key1', 'chat', 10),
  ('gemini-chat-2', 'AIza...key2', 'chat', 20),
  ('gemini-shared-1', 'AIza...key3', 'both', 30);
```

## Rotation Behavior

- Function tries active keys in ascending `priority`, then lower `fail_count`.
- On rate limit/quota errors, key enters cooldown (`cooldown_until`) and next key is tried.
- On repeated invalid-key errors, key is automatically deactivated after several failures.
- On success, key counters reset and `last_success_at` is updated.

## Manage Keys

Deactivate a key:

```sql
update public.gemini_api_keys
set is_active = false, updated_at = now()
where key_name = 'gemini-chat-2';
```

Reactivate a key:

```sql
update public.gemini_api_keys
set is_active = true, fail_count = 0, cooldown_until = null, updated_at = now()
where key_name = 'gemini-chat-2';
```

Inspect pool health:

```sql
select
  key_name,
  purpose,
  is_active,
  priority,
  fail_count,
  request_count,
  cooldown_until,
  last_error,
  last_success_at,
  last_failure_at
from public.gemini_api_keys
order by priority asc;
```

## Notes

- Keep `verify_jwt` enabled for the edge function.
- Client-side EXPO_PUBLIC Gemini keys are no longer required for AI chat.
- This setup currently covers chat (`services/gemini.ts`). Comment moderation now uses local `glin-profanity` filtering.
