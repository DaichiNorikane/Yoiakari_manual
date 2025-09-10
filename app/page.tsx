"use client"
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createPlace, deletePlace, loadPlaces, loadPlacesAsync, savePlaces, subscribePlaces } from '@/lib/storage'
import type { Place } from '@/types'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [newName, setNewName] = useState('')
  const router = useRouter()
  const palette = useMemo(() => [
    '#BFDBFE', '#C7D2FE', '#FBCFE8', '#FDE68A', '#A7F3D0', '#FECACA', '#FDE2E2'
  ], [])

  useEffect(() => {
    setPlaces(loadPlaces())
    // refresh from shared storage if enabled
    loadPlacesAsync().then(p => setPlaces(p))
    const unsub = subscribePlaces(setPlaces)
    return unsub
  }, [])

  function addPlace() {
    const name = newName.trim() || `場所 ${places.length + 1}`
    const p = createPlace(name)
    const next = [...places, p]
    savePlaces(next)
    setPlaces(next)
    setNewName('')
    router.push(`/place/${p.id}/equipment`)
  }

  function onRename(id: string, name: string) {
    const next = places.map(p => p.id === id ? { ...p, name } : p)
    setPlaces(next)
    savePlaces(next)
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">場所</h1>

      <div className="card p-3 flex gap-2 items-center">
        <input className="input" placeholder="新しい場所名（例：メインホール）" value={newName} onChange={e => setNewName(e.target.value)} />
        <button className="btn-accent" onClick={addPlace}>＋ 追加</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {places.map((p, i) => (
          <div key={p.id} className="card p-3 flex flex-col gap-2" style={{ background: '#fff' }}>
            <Link href={`/place/${p.id}/equipment`} className="w-full rounded-full px-4 py-2 text-center font-semibold shadow-sm" style={{ background: palette[i % palette.length] }}>
              {p.name}
            </Link>
            <div className="flex gap-2">
              <input className="input flex-1" value={p.name} onChange={e => onRename(p.id, e.target.value)} />
              <button className="btn-danger" onClick={() => { if (confirm('この場所を削除しますか？')) { const next = places.filter(x => x.id !== p.id); savePlaces(next); setPlaces(next); deletePlace(p.id) } }}>削除</button>
            </div>
          </div>
        ))}
      </div>

      {places.length === 0 && (
        <div className="text-slate-500">まだ場所はありません。上のフォームから追加してください。</div>
      )}
    </div>
  )
}
