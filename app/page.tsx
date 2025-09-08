"use client"
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createPlace, loadPlaces, loadPlacesAsync, savePlaces, subscribePlaces } from '@/lib/storage'
import type { Place } from '@/types'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [newName, setNewName] = useState('')
  const router = useRouter()

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">場所</h1>

      <div className="card p-3 flex gap-2">
        <input className="input" placeholder="場所名（例：メインホール）" value={newName} onChange={e => setNewName(e.target.value)} />
        <button className="btn" onClick={addPlace}>追加</button>
      </div>

      {places.length === 0 ? (
        <div className="text-slate-500">まだ場所はありません。上のフォームから追加してください。</div>
      ) : (
        <div className="card p-3">
          <div className="flex gap-2 overflow-x-auto">
            {places.map(p => (
              <Link key={p.id} href={`/place/${p.id}/equipment`} className="tab bg-white border border-slate-200">
                {p.name}
              </Link>
            ))}
          </div>
          <div className="mt-3 grid gap-3">
            {places.map(p => (
              <div key={p.id} className="p-3 rounded-lg border bg-slate-50">
                <div className="text-sm text-slate-500">名前変更</div>
                <input className="input mt-1" value={p.name} onChange={e => onRename(p.id, e.target.value)} />
                <div className="mt-2">
                  <Link className="btn" href={`/place/${p.id}/equipment`}>開く</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
