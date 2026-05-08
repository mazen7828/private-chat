// ============================================================
// Supabase Configuration & Client
// ============================================================

const SUPABASE_URL = 'https://czysueerdrjvubsovxpw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6eXN1ZWVyZHJqdnVic292eHB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzUxNDAsImV4cCI6MjA5Mzc1MTE0MH0.niIoozxiKUnm28KJ45PJTKLCL4osJ66OkkLsMM5jXHk';

// Initialize Supabase client using CDN global
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Storage bucket name
const MEDIA_BUCKET = 'media';
