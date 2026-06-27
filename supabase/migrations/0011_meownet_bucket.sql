-- supabase/migrations/0011_meownet_bucket.sql
-- ═══════════════════════════════════════════════════════════════
-- Storage Bucket: MeowNet
-- ═══════════════════════════════════════════════════════════════

-- 1. Insert bucket record into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'MeowNet',
  'MeowNet',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
) ON CONFLICT (id) DO NOTHING;

-- 2. Prevent updates or deletions of the MeowNet bucket to enforce immutability
CREATE OR REPLACE FUNCTION public.prevent_meownet_bucket_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.id = 'MeowNet' OR NEW.id = 'MeowNet') THEN
    RAISE EXCEPTION 'The MeowNet bucket configuration cannot be changed after creation.';
  ELSIF TG_OP = 'DELETE' AND OLD.id = 'MeowNet' THEN
    RAISE EXCEPTION 'The MeowNet bucket cannot be deleted.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_meownet_bucket_modification ON storage.buckets;
CREATE TRIGGER trigger_prevent_meownet_bucket_modification
  BEFORE UPDATE OR DELETE ON storage.buckets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_meownet_bucket_modification();

-- 3. Define policies for MeowNet bucket objects
-- Allow public SELECT (anyone can read objects without authorization)
DROP POLICY IF EXISTS "Allow public read access to MeowNet objects" ON storage.objects;
CREATE POLICY "Allow public read access to MeowNet objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'MeowNet');

-- Allow authenticated INSERT (only logged in users can upload)
DROP POLICY IF EXISTS "Allow authenticated uploads to MeowNet" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to MeowNet"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'MeowNet' 
    AND (SELECT auth.uid()) IS NOT NULL
  );

-- Allow owner UPDATE (only owner can modify their uploads)
DROP POLICY IF EXISTS "Allow owners to update their MeowNet objects" ON storage.objects;
CREATE POLICY "Allow owners to update their MeowNet objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'MeowNet' AND (SELECT auth.uid()) = owner);

-- Allow owner DELETE (only owner can delete their uploads)
DROP POLICY IF EXISTS "Allow owners to delete their MeowNet objects" ON storage.objects;
CREATE POLICY "Allow owners to delete their MeowNet objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'MeowNet' AND (SELECT auth.uid()) = owner);
