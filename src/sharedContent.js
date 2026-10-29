import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const sharedContentEnabled = Boolean(supabase)

function isContentSnapshot(content) {
  return content
    && typeof content === 'object'
    && !Array.isArray(content)
    && content.version === 1
    && Array.isArray(content.letters)
    && Array.isArray(content.reminders)
    && content.home
    && content.wordSearch
    && Array.isArray(content.mazeLevels)
    && content.blockSettings
    && content.settings
    && content.theme
}

export function getSupabaseClient() {
  return supabase
}

export async function fetchSharedContent() {
  if (!supabase) throw new Error('Shared content is not configured.')
  const { data, error } = await supabase
    .from('site_content')
    .select('content')
    .eq('id', 'main')
    .maybeSingle()
  if (error) throw new Error(`Could not load shared site content: ${error.message}`)
  if (data && !isContentSnapshot(data.content)) {
    throw new Error('The shared site content has an invalid format.')
  }
  return data?.content || null
}

export async function saveSharedContent(content) {
  if (!supabase) throw new Error('Shared content is not configured.')
  const { error } = await supabase
    .from('site_content')
    .upsert({ id: 'main', content }, { onConflict: 'id' })
  if (error) throw new Error(`Could not publish shared site content: ${error.message}`)
}
