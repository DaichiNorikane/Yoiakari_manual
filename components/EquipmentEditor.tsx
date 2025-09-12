"use client"
import { useEffect, useState } from 'react'
import { addEquipment, getPlace, getPlaceAsync, removeEquipment, updateEquipmentText, subscribePlaces, moveEquipment } from '@/lib/storage'
import Link from 'next/link'
import { useAdmin } from '@/lib/auth'

export default function EquipmentEditor({ placeId }: { placeId: string }) {
  const [items, setItems] = useState<{ id: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const admin = useAdmin()

  useEffect(() => {
    const p = getPlace(placeId)
    setItems(p?.sections.equipment.equipments ?? [])
    getPlaceAsync(placeId).then(pp => setItems(pp?.sections.equipment.equipments ?? []))
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === placeId)
      if (p2) setItems(p2.sections.equipment.equipments ?? [])
    })
    return unsub
  }, [placeId])

  function refresh() {
    const p = getPlace(placeId)
    setItems(p?.sections.equipment.equipments ?? [])
  }

  function add() {
    const text = input.trim()
    if (!text) return
    addEquipment(placeId, text)
    setInput('')
    refresh()
  }

  function onUpdate(id: string, text: string) {
    updateEquipmentText(placeId, id, text)
    refresh()
  }

  function onRemove(id: string) {
    removeEquipment(placeId, id)
    refresh()
  }

  function onMove(id: string, dir: 'up' | 'down') {
    moveEquipment(placeId, id, dir)
    refresh()
  }

  return (
    <div className="card p-3 space-y-3">
      <div className="text-sm text-slate-500">機材リスト</div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-slate-500 text-sm">まだ登録がありません</div>
        ) : items.map((it) => (
          <div key={it.id} className="flex items-center gap-2 p-2 rounded border bg-white">
            <input
              className="flex-1 bg-transparent outline-none"
              value={it.text}
              onChange={e => onUpdate(it.id, e.target.value)}
            />
            <div className="flex gap-1">
              <button className="btn-secondary !px-2" title="上へ" onClick={() => onMove(it.id, 'up')}>▲</button>
              <button className="btn-secondary !px-2" title="下へ" onClick={() => onMove(it.id, 'down')}>▼</button>
              <Link className="btn-secondary !px-2" title="画像" href={`/place/${placeId}/equipment/${it.id}`}>画像</Link>
            </div>
            {admin && (
              <button className="btn-secondary" onClick={() => onRemove(it.id)}>削除</button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="機材名を入力（例：ミキサー X32）"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn" onClick={add}>追加</button>
      </div>
    </div>
  )
}
