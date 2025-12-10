# ⚡ Supabase Quick Reference

## 🔗 Project Links

- **Dashboard**: https://app.supabase.com
- **Project ID**: `iuevsehuwyycnzwzzylf`
- **Project URL**: https://iuevsehuwyycnzwzzylf.supabase.co
- **API Docs**: https://iuevsehuwyycnzwzzylf.supabase.co/rest/v1/

## 🔑 Credentials

```
URL: https://iuevsehuwyycnzwzzylf.supabase.co
Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1ZXZzZWh1d3l5Y256d3p6eWxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjQxNzUsImV4cCI6MjA4MDQ0MDE3NX0.qCap1ARHKzZmYPWR-FpL7GbcpVv4YniKgF_Q82jJQrI
```

## 📊 Tables

### users
```sql
SELECT * FROM users;
```
Columns: id, user_id, username, avatar_url, total_xp, current_streak, longest_streak, myths_busted, lessons_completed

### friends
```sql
SELECT * FROM friends WHERE user_id = 'user_id_here';
```
Columns: id, user_id, friend_id, username, avatar_url, total_xp, current_streak, status

### friend_requests
```sql
SELECT * FROM friend_requests WHERE to_user_id = 'user_id_here';
```
Columns: id, from_user_id, to_user_id, from_username, from_avatar_url, status

### leaderboard
```sql
SELECT * FROM leaderboard ORDER BY total_xp DESC LIMIT 50;
```
Columns: id, user_id, username, avatar_url, total_xp, current_streak, rank

### feed_comments
```sql
SELECT * FROM feed_comments ORDER BY created_at DESC LIMIT 20;
```
Columns: id, user_id, username, avatar_url, content, created_at, updated_at

### user_stats
```sql
SELECT * FROM user_stats WHERE user_id = 'user_id_here';
```
Columns: id, user_id, total_xp, lessons_completed, myths_busted, current_streak, longest_streak, last_activity_date

## 🎯 Common Queries

### Insert User Profile
```sql
INSERT INTO users (user_id, username, avatar_url)
VALUES ('user_123', 'scientist', 'https://...')
ON CONFLICT (user_id) DO UPDATE 
SET username = EXCLUDED.username, updated_at = NOW();
```

### Get Leaderboard Top 10
```sql
SELECT user_id, username, total_xp, current_streak, rank
FROM leaderboard
ORDER BY total_xp DESC
LIMIT 10;
```

### Get User's Friends
```sql
SELECT * FROM friends 
WHERE user_id = 'user_123' 
AND status = 'accepted'
ORDER BY created_at DESC;
```

### Get Pending Friend Requests
```sql
SELECT * FROM friend_requests 
WHERE to_user_id = 'user_123' 
AND status = 'pending'
ORDER BY created_at DESC;
```

### Get Recent Feed Comments
```sql
SELECT * FROM feed_comments 
ORDER BY created_at DESC 
LIMIT 20;
```

## 🔄 TypeScript Usage

### Import Types
```tsx
import { Database } from '@/services/supabase.types';

type User = Database['public']['Tables']['users']['Row'];
type Friend = Database['public']['Tables']['friends']['Row'];
type Comment = Database['public']['Tables']['feed_comments']['Row'];
```

### Use Supabase Client
```tsx
import { supabase, isSupabaseConfigured } from '@/services/supabase';

// Check if configured
if (!isSupabaseConfigured()) {
  console.warn('Supabase offline');
  return;
}

// Query
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('user_id', 'user_123')
  .single();
```

## 🧪 Test Queries

### Create Test User
```sql
INSERT INTO users (user_id, username, avatar_url, total_xp)
VALUES ('test_user_1', 'Test Scientist', 'https://...', 100);
```

### Add Test Friend
```sql
INSERT INTO friends (user_id, friend_id, username, status)
VALUES ('user_1', 'user_2', 'Friend Name', 'accepted');
```

### Post Test Comment
```sql
INSERT INTO feed_comments (user_id, username, avatar_url, content)
VALUES ('user_1', 'Scientist', 'https://...', 'Great lesson!');
```

## 🔐 RLS Testing

### Check Current User (in app)
```tsx
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user?.id);
```

### Test RLS Policy
```sql
-- This query respects RLS policies
SELECT * FROM users; -- Should work (public read)

-- This respects RLS based on auth.uid()
SELECT * FROM friends; -- Only your friends
```

## 📈 Monitoring

### Check Table Rows
```sql
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

### Check Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## 🚀 Deployment Commands

### Install Dependencies
```bash
npm install @supabase/supabase-js
```

### Generate Fresh Types
```bash
# In VS Code terminal, use MCP tool:
# mcp_supabase_generate_typescript_types
```

### Test Connection
```tsx
import { supabase } from '@/services/supabase';

// Simple test
const { data } = await supabase.from('users').select('*').limit(1);
console.log('Connected!', data);
```

## 📝 Migration Notes

### Already Applied
- ✅ create_users_table (v20251210095730)
- ✅ create_friends_table (v20251210095732)
- ✅ create_friend_requests_table (v20251210095734)
- ✅ create_leaderboard_table (v20251210095737)
- ✅ create_feed_comments_table (v20251210095739)
- ✅ create_user_stats_table (v20251210095743)

## 🔗 Useful Links

- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Status**: All infrastructure deployed and operational ✅
