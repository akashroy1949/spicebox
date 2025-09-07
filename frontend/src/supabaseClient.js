import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://miozfvxmnehtxqgnnmcm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pb3pmdnhtbmVodHhxZ25ubWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMzc2MjgsImV4cCI6MjA3MjgxMzYyOH0.hexMhnc5G1SkwURPYHXaYS7XgSQwnH5xQspw4AfxwgI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)


