"use client"
import { isSharedEnabled, supabase } from '@/lib/supabase'
import { loadPlacesAsync, savePlaces } from '@/lib/storage'

let started = false

export function startRealtime() {
  if (!isSharedEnabled || started || !supabase) return
  started = true

  const channel = supabase
    .channel('manual_docs_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'manual_docs',
      filter: 'id=eq.default',
    }, async () => {
      // fetch remote and update local cache without re-uploading
      const list = await loadPlacesAsync()
      // loadPlacesAsync already writes local cache and notifies subscribers
      // but if it returns, notify again to ensure UI refresh
      savePlaces(list, { skipRemote: true })
    })
    .subscribe()

  // optional: expose for debugging
  if (typeof window !== 'undefined') {
    // @ts-expect-error
    window.__realtimeChannel = channel
  }
}

