-- User Preferences Table
-- Stores customization settings for each user's dashboard

CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Section Layout
  section_order TEXT[] DEFAULT ARRAY['hotLeads', 'warmLeads', 'upcomingCalls', 'allBookedCalls', 'recentActivity', 'leadStatusBuckets', 'sentimentAnalysis', 'statusBreakdown', 'archivedLeads'],
  sections_expanded JSONB DEFAULT '{"hotLeads": true, "warmLeads": true, "upcomingCalls": true, "allBookedCalls": true, "recentActivity": true, "leadStatusBuckets": true, "sentimentAnalysis": true, "statusBreakdown": true, "archivedLeads": false}'::jsonb,
  sections_visible JSONB DEFAULT '{"hotLeads": true, "warmLeads": true, "upcomingCalls": true, "allBookedCalls": true, "recentActivity": true, "leadStatusBuckets": true, "sentimentAnalysis": true, "statusBreakdown": true, "archivedLeads": true}'::jsonb,

  -- Dashboard Settings
  default_time_range VARCHAR(10) DEFAULT 'all' CHECK (default_time_range IN ('today', 'week', 'month', 'all')),
  auto_refresh_enabled BOOLEAN DEFAULT true,
  auto_refresh_interval INTEGER DEFAULT 30 CHECK (auto_refresh_interval IN (15, 30, 60, 0)), -- seconds, 0 = off

  -- Metric Cards
  visible_metric_cards TEXT[] DEFAULT ARRAY['totalLeads', 'messagesSent', 'replyRate', 'hotLeads', 'avgResponse', 'callsBooked', 'upcomingCalls'],

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one preferences record per user
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
