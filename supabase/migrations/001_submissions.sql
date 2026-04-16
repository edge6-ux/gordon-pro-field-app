CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  property_address TEXT NOT NULL,
  tree_height TEXT NOT NULL,
  tree_location TEXT,
  lean_direction TEXT DEFAULT 'none',
  proximity_to_structures TEXT DEFAULT 'none',
  additional_notes TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  ai_result JSONB,
  status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'customer'
);

CREATE INDEX idx_submissions_source ON submissions(source);

CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_submissions_status ON submissions(status);
