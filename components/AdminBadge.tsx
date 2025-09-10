"use client"
import { useAdmin, loginAdmin, logoutAdmin, ADMIN_CODE } from '@/lib/auth'

export default function AdminBadge() {
  const on = useAdmin()

  function toggle() {
    if (on) {
      logoutAdmin()
      return
    }
    const code = prompt('管理者コードを入力してください') || ''
    if (!code) return
    const ok = loginAdmin(code)
    if (!ok) alert('コードが違います')
  }

  const title = on
    ? '管理者モード（削除が可能）'
    : ADMIN_CODE
      ? '一般モード（削除不可）— クリックで管理者ログイン'
      : '管理者コード未設定のためログイン不可'

  return (
    <button
      onClick={toggle}
      title={title}
      className={`fixed bottom-3 left-3 px-2.5 py-1.5 rounded-full text-xs font-medium shadow ${on ? 'bg-indigo-500 text-white' : 'bg-slate-300 text-slate-700'} ${ADMIN_CODE ? '' : 'opacity-60 cursor-not-allowed'}`}
      disabled={!ADMIN_CODE}
    >
      {on ? '管理: ON' : '管理: OFF'}
    </button>
  )
}

