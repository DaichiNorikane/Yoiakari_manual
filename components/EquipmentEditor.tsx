"use client"
import { useEffect, useState, useRef } from 'react'
import { addEquipment, getPlace, getPlaceAsync, removeEquipment, updateEquipmentText, subscribePlaces, reorderEquipment } from '@/lib/storage'
import Link from 'next/link'
import { useAdmin } from '@/lib/auth'

export default function EquipmentEditor({ placeId }: { placeId: string }) {
  const [items, setItems] = useState<{ id: string; text: string }[]>([])
  const [input, setInput] = useState('')
  const admin = useAdmin()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const overIndexRef = useRef<number>(-1)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [insertIndex, setInsertIndex] = useState<number>(-1)
  const pressTimerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)

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

  function beginDrag(id: string) {
    dragIdRef.current = id
    setDraggingId(id)
    const fromIdx = items.findIndex(x => x.id === id)
    setInsertIndex(fromIdx)
    overIndexRef.current = fromIdx
  }

  function clearTimers() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  function onPointerDown(e: React.PointerEvent, id: string) {
    startPosRef.current = { x: e.clientX, y: e.clientY }
    clearTimers()
    if (e.pointerType === 'mouse') {
      beginDrag(id)
    } else {
      pressTimerRef.current = window.setTimeout(() => beginDrag(id), 250)
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const start = startPosRef.current
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (!dragIdRef.current) {
      // cancel long-press if moved too much before drag starts
      if (Math.hypot(dx, dy) > 6) clearTimers()
      return
    }
    // dragging: compute over index
    const container = containerRef.current
    if (!container) return
    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-row="1"]'))
    let idx = rows.findIndex((el) => {
      const r = el.getBoundingClientRect()
      return e.clientY < r.top + r.height / 2
    })
    if (idx === -1) idx = rows.length
    overIndexRef.current = idx
    setInsertIndex(idx)
  }

  function onPointerUp() {
    clearTimers()
    if (dragIdRef.current && overIndexRef.current >= 0) {
      let target = overIndexRef.current
      const fromIdx = items.findIndex(x => x.id === dragIdRef.current)
      if (fromIdx >= 0 && fromIdx < target) target = target - 1
      reorderEquipment(placeId, dragIdRef.current, target)
      refresh()
    }
    dragIdRef.current = null
    overIndexRef.current = -1
    setDraggingId(null)
    setInsertIndex(-1)
    startPosRef.current = null
  }

  return (
    <div className="card p-3 space-y-3">
      <div className="text-sm text-slate-500">機材リスト</div>
      <div className="space-y-2" ref={containerRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {items.length === 0 ? (
          <div className="text-slate-500 text-sm">まだ登録がありません</div>
        ) : items.map((it, i) => (
          <div
            key={it.id}
            data-row="1"
            className={`flex flex-col gap-2 rounded border bg-white transition-colors ${draggingId === it.id ? '!border-violet-300 bg-violet-50 cursor-grabbing shadow' : 'cursor-grab'}`}
            onPointerDown={(e) => onPointerDown(e, it.id)}
            title="長押しして上下にドラッグで並び替え"
          >
            {draggingId && insertIndex === i && (
              <div className="h-0.5 -mt-1 rounded bg-indigo-400" />
            )}
            <div className="flex items-center gap-2 p-2 w-full">
              <input
                className="flex-1 bg-transparent outline-none"
                value={it.text}
                onChange={e => onUpdate(it.id, e.target.value)}
              />
              <Link className="btn-secondary !px-2" title="画像" href={`/place/${placeId}/equipment/${it.id}`}>画像</Link>
              {admin && (
                <button className="btn-secondary" onClick={() => onRemove(it.id)}>削除</button>
              )}
            </div>
            {draggingId && insertIndex === i + 1 && (
              <div className="h-0.5 mb-1 rounded bg-indigo-400" />
            )}
          </div>
        ))}
        {draggingId && insertIndex === items.length && (
          <div className="h-0.5 rounded bg-indigo-400" />
        )}
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
