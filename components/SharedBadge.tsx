"use client"
import { isSharedEnabled, SUPABASE_URL } from '@/lib/supabase'

export default function SharedBadge() {
  const on = isSharedEnabled
  return (
    <div
      title={on ? `共有モード有効（${SUPABASE_URL}）` : 'ローカルのみモード'}
      className={`fixed bottom-3 right-3 px-2.5 py-1.5 rounded-full text-xs font-medium shadow ${on ? 'bg-emerald-400 text-white' : 'bg-slate-300 text-slate-700'}`}
    >
      {on ? '共有: ON' : '共有: OFF'}
    </div>
  )
}
