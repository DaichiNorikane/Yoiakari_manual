"use client"
import { isSharedEnabled, SUPABASE_URL } from '@/lib/supabase'

export default function SharedBadge() {
  const on = isSharedEnabled
  return (
    <div
      title={on ? `Shared via ${SUPABASE_URL}` : 'Local-only mode'}
      className={`fixed bottom-3 right-3 px-2 py-1 rounded text-xs font-medium shadow ${on ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}
    >
      {on ? 'Shared: ON' : 'Shared: OFF'}
    </div>
  )
}

