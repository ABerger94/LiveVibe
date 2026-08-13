import { createClient } from '@supabase/supabase-js';

// Used server-side only, with the service role key, to upload images to
// Supabase Storage. The service role key bypasses row-level security, so
// it must never be sent to the client — every route that uses this goes
// through our own JWT auth first.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = (supabaseUrl && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabase) {
  console.warn('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — avatar/photo uploads are disabled.');
}

export const AVATAR_BUCKET = 'avatars';
export const PHOTO_BUCKET = 'photos';
