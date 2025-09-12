// @ts-nocheck
"use client"
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSharedEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase: SupabaseClient | null = isSharedEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const STORAGE_BUCKET = 'manual-images'

export function extractStorageKey(url: string): string | null {
  try {
    const u = new URL(url)
    const idx = u.pathname.indexOf(`/${STORAGE_BUCKET}/`)
    if (idx === -1) return null
    return u.pathname.slice(idx + (`/${STORAGE_BUCKET}/`).length)
  } catch {
    return null
  }
}

export async function maybeSignPublicUrl(url: string): Promise<string> {
  if (!isSharedEnabled || !supabase) return url
  const key = extractStorageKey(url)
  if (!key) return url
  try {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(key, 3600)
    if (error || !data?.signedUrl) return url
    return data.signedUrl
  } catch {
    return url
  }
}

export type ManualDoc = {
  id: string
  data: unknown
}

const DOC_ID = 'default'
const TABLE = 'manual_docs'

export async function fetchSharedDoc<T = unknown>(): Promise<T | null> {
  if (!isSharedEnabled) return null
  const { data, error } = await supabase!
    .from(TABLE)
    .select('data')
    .eq('id', DOC_ID)
    .single()
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] fetchSharedDoc error', error)
    return null
  }
  return (data?.data as T) ?? null
}

export async function saveSharedDoc(data: unknown) {
  if (!isSharedEnabled) return
  const { error } = await supabase!
    .from(TABLE)
    .upsert({ id: DOC_ID, data }, { onConflict: 'id' })
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] saveSharedDoc error', error)
  }
}

// Small helper to quickly check status in DevTools
export function __debugShared() {
  // eslint-disable-next-line no-console
  console.log('[shared-enabled]', isSharedEnabled, SUPABASE_URL)
}

// expose to window for quick console access
if (typeof window !== 'undefined') {
  // @ts-expect-error attach debug helper to global
  window.__debugShared = __debugShared
}
