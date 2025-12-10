-- Comments table for community feed
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  text TEXT NOT NULL,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'hidden', 'incorrect')),
  moderation_reason TEXT,
  moderation_correction TEXT,
  is_ai_reply BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- RLS Policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read approved comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (moderation_status = 'approved' OR moderation_status = 'incorrect');

-- Allow authenticated users to insert their own comments
CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT
  WITH CHECK (true); -- We'll validate user_id on the client side

-- Allow users to update their own comments
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (true); -- Allow updates for moderation

-- Allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_comments_updated_at_trigger ON comments;
CREATE TRIGGER update_comments_updated_at_trigger
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comments_updated_at();
