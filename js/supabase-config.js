// ============================================================
// Supabase Configuration & Client
// ============================================================

const SUPABASE_URL = 'https://czysueerdrjvubsovxpw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7rTdRxmr5S6naDFfaLnfvQ_3Zihtpes';

// Initialize Supabase client using CDN global
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Storage bucket name
const MEDIA_BUCKET = 'media';
