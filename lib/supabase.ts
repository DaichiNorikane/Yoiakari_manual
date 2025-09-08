"use client"
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const isSharedEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = isSharedEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : undefined as any

export type ManualDoc = {
  id: string
  data: unknown
}

const DOC_ID = 'default'
const TABLE = 'manual_docs'

export async function fetchSharedDoc<T=unknown>(): Promise<T | null> {
  if (!isSharedEnabled) return null
  const { data, error } = await supabase
    .from<ManualDoc>(TABLE)
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
  const { error } = await supabase
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
