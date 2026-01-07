-- Create wallet_labels table
-- Stores user-defined labels for wallet addresses
CREATE TABLE IF NOT EXISTS wallet_labels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Each user can only have one label per address
  UNIQUE(user_id, address)
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS wallet_labels_user_id_idx ON wallet_labels(user_id);

-- Create index for address lookups
CREATE INDEX IF NOT EXISTS wallet_labels_address_idx ON wallet_labels(address);

-- Enable Row Level Security
ALTER TABLE wallet_labels ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own labels
CREATE POLICY "Users can read own labels"
  ON wallet_labels
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own labels
CREATE POLICY "Users can insert own labels"
  ON wallet_labels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own labels
CREATE POLICY "Users can update own labels"
  ON wallet_labels
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own labels
CREATE POLICY "Users can delete own labels"
  ON wallet_labels
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_wallet_labels_updated_at
  BEFORE UPDATE ON wallet_labels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
