import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rsvtzigjmsmfarsbjhdx.supabase.co'
// This is a public anonymous key, which is safe to be exposed in a client-side application.
// Supabase security is handled by Row Level Security (RLS) policies.
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdnR6aWdqbXNtZmFyc2JqaGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MTA3NDMsImV4cCI6MjA3MTQ4Njc0M30.7bBd3pgZ26MZgKZvwXOuowYflDgdB3blKc8lELb0nt8'

export const supabase = createClient(supabaseUrl, supabaseKey);
