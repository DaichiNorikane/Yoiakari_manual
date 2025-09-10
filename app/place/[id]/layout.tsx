"use client"
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { getPlace, getPlaceAsync, loadPlaces, loadPlacesAsync, savePlaces, subscribePlaces } from '@/lib/storage'
import { useEffect, useMemo, useRef, useState } from 'react'

const sections = [
  { key: 'equipment', label: '機材リスト' },
  { key: 'tasks', label: 'やることリスト' },
  { key: 'wiring', label: '繋ぎ方' },
  { key: 'teardown', label: 'バラシ方' },
] as const

export default function PlaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>()
  const pathname = usePathname()
  const [name, setName] = useState('')
  const loadedRef = useRef(false)
  const palette = useMemo(() => [
    '#BFDBFE', '#C7D2FE', '#FBCFE8', '#FDE68A'
  ], [])

  useEffect(() => {
    const p = getPlace(params.id)
    if (p) {
      setName(p.name)
      loadedRef.current = true
    }
    // refresh from shared storage
    getPlaceAsync(params.id).then(pp => {
      if (pp) {
        setName(pp.name)
        loadedRef.current = true
      }
    })
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === params.id)
      if (p2) setName(p2.name)
    })
    return unsub
  }, [params.id])

  useEffect(() => {
    // save name after initial load, and avoid saving empty implicitly
    if (!loadedRef.current) return
    if (!name.trim()) return
    const list = loadPlaces()
    const idx = list.findIndex(p => p.id === params.id)
    if (idx >= 0 && list[idx].name !== name) {
      list[idx].name = name
      savePlaces(list)
    }
  }, [name, params.id])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="btn-secondary">← 一覧へ</Link>
        <input className="input" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {sections.map((s, i) => (
          <Link
            key={s.key}
            href={`/place/${params.id}/${s.key}`}
            className="w-full rounded-full px-4 py-2 text-center font-semibold shadow-sm"
            style={{ background: palette[i % palette.length] }}
          >
            {s.label}
          </Link>
        ))}
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}
