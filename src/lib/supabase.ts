import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://ltnlmgtoqecvctyeetma.supabase.co';
const SUPABASE_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bmxtZ3RvcWVjdmN0eWVldG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjM4MTAsImV4cCI6MjA4OTYzOTgxMH0.OB5An1HAkEiASsE_cV1KoFCWBcyYQGUPa6BKsM6LwaI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
