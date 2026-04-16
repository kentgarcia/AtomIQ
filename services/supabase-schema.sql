/**
 * Supabase Schema Migrations for AtomIQ
 * 
 * This file documents the SQL to create the necessary tables for:
 * - User profiles
 * - Friend relationships and requests
 * - Leaderboard data
 * - Community feed comments
 * 
 * Copy and paste these into your Supabase SQL editor to set up the schema.
 */

-- ============================================
-- User Profiles Table
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  friend_code TEXT NOT NULL UNIQUE,
  display_name_updated_at TIMESTAMP WITH TIME ZONE,
  next_display_name_change_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  myths_busted INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT users_display_name_not_blank_chk CHECK (BTRIM(display_name) <> ''),
  CONSTRAINT users_friend_code_format_chk CHECK (friend_code ~ '^[A-Z0-9]{6}$')
);

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read all profiles
CREATE POLICY "Users can view all profiles"
  ON users FOR SELECT
  USING (true);

-- RLS Policy: Public leaderboard reads (anon)
CREATE POLICY "Leaderboard public select"
  ON users FOR SELECT
  TO anon
  USING (true);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policy: Service role can insert
CREATE POLICY "Service role can insert profiles"
  ON users FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Friends Table
-- ============================================
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS on friends
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own friends
CREATE POLICY "Users can view their own friends"
  ON friends FOR SELECT
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can insert friends
CREATE POLICY "Users can create friend relationships"
  ON friends FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can delete their own friends
CREATE POLICY "Users can remove friends"
  ON friends FOR DELETE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- Friend Requests Table
-- ============================================
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  from_username TEXT NOT NULL,
  from_display_name TEXT,
  from_friend_code TEXT,
  from_avatar_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- Enable RLS on friend_requests
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view requests sent to them
CREATE POLICY "Users can view received requests"
  ON friend_requests FOR SELECT
  USING (to_user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can create requests
CREATE POLICY "Users can create friend requests"
  ON friend_requests FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update requests sent to them
CREATE POLICY "Users can respond to requests"
  ON friend_requests FOR UPDATE
  USING (to_user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- Leaderboard Table (for caching/ranking)
-- ============================================
CREATE TABLE leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar_url TEXT,
  total_xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  rank INTEGER,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Enable RLS on leaderboard
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view leaderboard
CREATE POLICY "Leaderboard is public"
  ON leaderboard FOR SELECT
  USING (true);

-- ============================================
-- Community Feed Comments Table
-- ============================================
CREATE TABLE feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Enable RLS on feed_comments
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view comments
CREATE POLICY "Comments are public"
  ON feed_comments FOR SELECT
  USING (true);

-- RLS Policy: Users can insert their own comments
CREATE POLICY "Users can add comments"
  ON feed_comments FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON feed_comments FOR UPDATE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- RLS Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON feed_comments FOR DELETE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- User Stats Table (for detailed stats syncing)
-- ============================================
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  myths_busted INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all stats (public leaderboard)
CREATE POLICY "Stats are viewable"
  ON user_stats FOR SELECT
  USING (true);

-- RLS Policy: Users can update their own stats
CREATE POLICY "Users can update their own stats"
  ON user_stats FOR UPDATE
  USING (user_id = (SELECT user_id FROM users WHERE id = auth.uid() LIMIT 1));

-- ============================================
-- Identity Enforcement (Server-Side)
-- ============================================

CREATE OR REPLACE FUNCTION generate_friend_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  candidate TEXT;
  idx INTEGER;
BEGIN
  LOOP
    candidate := '';

    FOR idx IN 1..6 LOOP
      candidate := candidate || SUBSTR(alphabet, 1 + FLOOR(RANDOM() * LENGTH(alphabet))::INT, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM users u
      WHERE u.friend_code = candidate
    );
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_user_identity_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  normalized_username TEXT;
  normalized_display_name TEXT;
  normalized_friend_code TEXT;
BEGIN
  normalized_username := COALESCE(NULLIF(BTRIM(NEW.username), ''), NULLIF(BTRIM(OLD.username), ''), 'Scientist');
  NEW.username := normalized_username;

  normalized_display_name := COALESCE(NULLIF(BTRIM(NEW.display_name), ''), NULLIF(BTRIM(OLD.display_name), ''), normalized_username, 'Scientist');
  NEW.display_name := normalized_display_name;

  normalized_friend_code := CASE
    WHEN NEW.friend_code IS NULL THEN NULL
    ELSE UPPER(REGEXP_REPLACE(NEW.friend_code, '[^A-Za-z0-9]', '', 'g'))
  END;

  IF TG_OP = 'INSERT' THEN
    IF normalized_friend_code IS NULL OR LENGTH(normalized_friend_code) <> 6 THEN
      NEW.friend_code := generate_friend_code();
    ELSE
      NEW.friend_code := normalized_friend_code;
    END IF;

    -- Initial profile creation should not consume the 7-day cooldown.
    NEW.display_name_updated_at := NULL;
    NEW.next_display_name_change_at := NULL;

    RETURN NEW;
  END IF;

  IF OLD.friend_code IS NOT NULL AND normalized_friend_code IS DISTINCT FROM OLD.friend_code THEN
    RAISE EXCEPTION 'friend_code is immutable once set'
      USING ERRCODE = 'P0001';
  END IF;

  IF OLD.friend_code IS NULL THEN
    IF normalized_friend_code IS NULL OR LENGTH(normalized_friend_code) <> 6 THEN
      NEW.friend_code := generate_friend_code();
    ELSE
      NEW.friend_code := normalized_friend_code;
    END IF;
  ELSE
    NEW.friend_code := OLD.friend_code;
  END IF;

  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    IF OLD.display_name IS NOT NULL
      AND OLD.next_display_name_change_at IS NOT NULL
      AND NOW() < OLD.next_display_name_change_at THEN
      RAISE EXCEPTION
        'display_name can only be changed every 7 days. next_allowed_at=%',
        OLD.next_display_name_change_at
        USING ERRCODE = 'P0001';
    END IF;

    IF OLD.display_name IS NULL THEN
      NEW.display_name_updated_at := OLD.display_name_updated_at;
      NEW.next_display_name_change_at := OLD.next_display_name_change_at;
    ELSE
      NEW.display_name_updated_at := NOW();
      NEW.next_display_name_change_at := NOW() + INTERVAL '7 days';
    END IF;
  ELSE
    NEW.display_name_updated_at := OLD.display_name_updated_at;
    NEW.next_display_name_change_at := OLD.next_display_name_change_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_user_identity_rules ON users;
CREATE TRIGGER enforce_user_identity_rules
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION enforce_user_identity_rules();

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE UNIQUE INDEX idx_users_friend_code ON users(friend_code);
CREATE INDEX idx_users_display_name ON users(display_name);
CREATE INDEX idx_users_next_display_name_change_at ON users(next_display_name_change_at);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_friend_requests_to_user ON friend_requests(to_user_id);
CREATE INDEX idx_friend_requests_from_user ON friend_requests(from_user_id);
CREATE INDEX idx_friend_requests_from_friend_code ON friend_requests(from_friend_code);
CREATE INDEX idx_feed_comments_user_id ON feed_comments(user_id);
CREATE INDEX idx_feed_comments_created_at ON feed_comments(created_at DESC);
CREATE INDEX idx_leaderboard_total_xp ON leaderboard(total_xp DESC);
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- ============================================
-- Account Transfer Codes (Game-style device transfer)
-- ============================================

CREATE TABLE account_transfer_codes (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE account_transfer_codes ENABLE ROW LEVEL SECURITY;

-- No direct client read/write access. Use RPC functions below.
CREATE POLICY "Transfer code owner can view metadata"
  ON account_transfer_codes FOR SELECT
  TO authenticated
  USING (
    user_id = (
      SELECT u.user_id
      FROM users u
      WHERE u.id = auth.uid()
      LIMIT 1
    )
  );

CREATE INDEX idx_account_transfer_codes_expires_at ON account_transfer_codes(expires_at);
CREATE INDEX idx_account_transfer_codes_active ON account_transfer_codes(expires_at) WHERE used_at IS NULL;

CREATE OR REPLACE FUNCTION generate_transfer_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
  idx INTEGER;
BEGIN
  LOOP
    candidate := '';

    FOR idx IN 1..8 LOOP
      candidate := candidate || SUBSTR(alphabet, 1 + FLOOR(RANDOM() * LENGTH(alphabet))::INT, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM account_transfer_codes atc
      WHERE atc.code_hash = ENCODE(extensions.DIGEST(candidate, 'sha256'), 'hex')
        AND atc.used_at IS NULL
        AND atc.expires_at > NOW()
    );
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION issue_transfer_code()
RETURNS TABLE(code TEXT, expires_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_auth_id UUID;
  current_user_id TEXT;
  current_is_npc BOOLEAN := FALSE;
  generated_code TEXT;
  generated_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  current_auth_id := auth.uid();
  IF current_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT u.user_id, COALESCE(u.is_npc, FALSE)
    INTO current_user_id, current_is_npc
  FROM users u
  WHERE u.id = current_auth_id
  LIMIT 1;

  IF current_user_id IS NULL THEN
    SELECT u.user_id, COALESCE(u.is_npc, FALSE)
      INTO current_user_id, current_is_npc
    FROM users u
    WHERE u.user_id = current_auth_id::TEXT
    LIMIT 1;

    IF current_user_id IS NOT NULL THEN
      UPDATE users
        SET id = current_auth_id,
            updated_at = NOW()
      WHERE user_id = current_user_id;
    END IF;
  END IF;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No cloud profile found for this device. Sync once before generating a transfer code.';
  END IF;

  IF current_is_npc THEN
    RAISE EXCEPTION 'Transfer codes are not available for NPC accounts.';
  END IF;

  generated_code := generate_transfer_code();
  generated_expires_at := NOW() + INTERVAL '10 minutes';

  INSERT INTO account_transfer_codes (user_id, code_hash, created_at, expires_at, used_at)
  VALUES (
    current_user_id,
    ENCODE(extensions.DIGEST(generated_code, 'sha256'), 'hex'),
    NOW(),
    generated_expires_at,
    NULL
  )
  ON CONFLICT (user_id) DO UPDATE
    SET code_hash = EXCLUDED.code_hash,
        created_at = EXCLUDED.created_at,
        expires_at = EXCLUDED.expires_at,
        used_at = NULL;

  code := generated_code;
  expires_at := generated_expires_at;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION preview_transfer_code(input_code TEXT)
RETURNS TABLE(
  user_id TEXT,
  username TEXT,
  display_name TEXT,
  friend_code TEXT,
  avatar_url TEXT,
  total_xp INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  myths_busted INTEGER,
  lessons_completed INTEGER,
  display_name_updated_at TIMESTAMP WITH TIME ZONE,
  next_display_name_change_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_code TEXT;
  source_user_id TEXT;
BEGIN
  normalized_code := UPPER(REGEXP_REPLACE(COALESCE(input_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF LENGTH(normalized_code) <> 8 THEN
    RAISE EXCEPTION 'Invalid transfer code format';
  END IF;

  SELECT atc.user_id
    INTO source_user_id
  FROM account_transfer_codes atc
  JOIN users u ON u.user_id = atc.user_id
  WHERE atc.code_hash = ENCODE(extensions.DIGEST(normalized_code, 'sha256'), 'hex')
    AND atc.used_at IS NULL
    AND atc.expires_at > NOW()
    AND COALESCE(u.is_npc, FALSE) = FALSE
  LIMIT 1;

  IF source_user_id IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM account_transfer_codes atc
      JOIN users u ON u.user_id = atc.user_id
      WHERE atc.code_hash = ENCODE(extensions.DIGEST(normalized_code, 'sha256'), 'hex')
        AND atc.used_at IS NULL
        AND atc.expires_at > NOW()
        AND COALESCE(u.is_npc, FALSE) = TRUE
    ) THEN
      RAISE EXCEPTION 'Transfer code belongs to an NPC account and cannot be used.';
    END IF;

    RAISE EXCEPTION 'Transfer code is invalid or expired';
  END IF;

  RETURN QUERY
  SELECT
    u.user_id,
    u.username,
    u.display_name,
    u.friend_code,
    u.avatar_url,
    COALESCE(u.total_xp, 0),
    COALESCE(u.current_streak, 0),
    COALESCE(u.longest_streak, 0),
    COALESCE(u.myths_busted, 0),
    COALESCE(u.lessons_completed, 0),
    u.display_name_updated_at,
    u.next_display_name_change_at
  FROM users u
  WHERE u.user_id = source_user_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION redeem_transfer_code(
  input_code TEXT,
  allow_overwrite BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  user_id TEXT,
  username TEXT,
  display_name TEXT,
  friend_code TEXT,
  avatar_url TEXT,
  total_xp INTEGER,
  current_streak INTEGER,
  longest_streak INTEGER,
  myths_busted INTEGER,
  lessons_completed INTEGER,
  display_name_updated_at TIMESTAMP WITH TIME ZONE,
  next_display_name_change_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_auth_id UUID;
  normalized_code TEXT;
  source_user_id TEXT;
  source_auth_id UUID;
  target_user_id TEXT;
  target_total_xp INTEGER := 0;
  target_lessons_completed INTEGER := 0;
  target_myths_busted INTEGER := 0;
BEGIN
  current_auth_id := auth.uid();
  IF current_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  normalized_code := UPPER(REGEXP_REPLACE(COALESCE(input_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF LENGTH(normalized_code) <> 8 THEN
    RAISE EXCEPTION 'Invalid transfer code format';
  END IF;

  SELECT atc.user_id, u.id
    INTO source_user_id, source_auth_id
  FROM account_transfer_codes atc
  JOIN users u ON u.user_id = atc.user_id
  WHERE atc.code_hash = ENCODE(extensions.DIGEST(normalized_code, 'sha256'), 'hex')
    AND atc.used_at IS NULL
    AND atc.expires_at > NOW()
    AND COALESCE(u.is_npc, FALSE) = FALSE
  LIMIT 1;

  IF source_user_id IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM account_transfer_codes atc
      JOIN users u ON u.user_id = atc.user_id
      WHERE atc.code_hash = ENCODE(extensions.DIGEST(normalized_code, 'sha256'), 'hex')
        AND atc.used_at IS NULL
        AND atc.expires_at > NOW()
        AND COALESCE(u.is_npc, FALSE) = TRUE
    ) THEN
      RAISE EXCEPTION 'Transfer code belongs to an NPC account and cannot be used.';
    END IF;

    RAISE EXCEPTION 'Transfer code is invalid or expired';
  END IF;

  IF source_auth_id <> current_auth_id THEN
    SELECT
      u.user_id,
      COALESCE(u.total_xp, 0),
      COALESCE(u.lessons_completed, 0),
      COALESCE(u.myths_busted, 0)
      INTO target_user_id, target_total_xp, target_lessons_completed, target_myths_busted
    FROM users u
    WHERE u.id = current_auth_id
    LIMIT 1;

    IF target_user_id IS NOT NULL AND target_user_id <> source_user_id THEN
      IF (NOT allow_overwrite)
        AND (target_total_xp > 0 OR target_lessons_completed > 0 OR target_myths_busted > 0) THEN
        RAISE EXCEPTION 'Current account already has progress. Preview is ready; confirm overwrite to continue.';
      END IF;

      DELETE FROM users WHERE id = current_auth_id;
    END IF;

    UPDATE users u
      SET id = current_auth_id,
          updated_at = NOW()
    WHERE u.user_id = source_user_id;
  END IF;

  UPDATE account_transfer_codes atc
    SET used_at = NOW()
  WHERE atc.user_id = source_user_id;

  RETURN QUERY
  SELECT
    u.user_id,
    u.username,
    u.display_name,
    u.friend_code,
    u.avatar_url,
    COALESCE(u.total_xp, 0),
    COALESCE(u.current_streak, 0),
    COALESCE(u.longest_streak, 0),
    COALESCE(u.myths_busted, 0),
    COALESCE(u.lessons_completed, 0),
    u.display_name_updated_at,
    u.next_display_name_change_at
  FROM users u
  WHERE u.user_id = source_user_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION generate_transfer_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION issue_transfer_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION preview_transfer_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION redeem_transfer_code(TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION issue_transfer_code() FROM anon;
REVOKE EXECUTE ON FUNCTION preview_transfer_code(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION redeem_transfer_code(TEXT, BOOLEAN) FROM anon;

GRANT EXECUTE ON FUNCTION issue_transfer_code() TO authenticated;
GRANT EXECUTE ON FUNCTION preview_transfer_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_transfer_code(TEXT, BOOLEAN) TO authenticated;
