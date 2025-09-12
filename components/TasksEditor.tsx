"use client"
import { useEffect, useState, useRef } from 'react'
import { addTask, getPlace, getPlaceAsync, removeTask, toggleTask, updateTaskText, subscribePlaces, reorderTasks } from '@/lib/storage'
import type { SectionKey } from '@/types'
import { useAdmin } from '@/lib/auth'

export default function TasksEditor({ placeId, section = 'tasks' as Extract<SectionKey, 'tasks' | 'teardown'> }: { placeId: string, section?: Extract<SectionKey, 'tasks' | 'teardown'> }) {
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([])
  const [input, setInput] = useState('')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const overIndexRef = useRef<number>(-1)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [insertIndex, setInsertIndex] = useState<number>(-1)
  const pressTimerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const admin = useAdmin()

  useEffect(() => {
    const p = getPlace(placeId)
    setTasks(p?.sections[section].tasks ?? [])
    getPlaceAsync(placeId).then(pp => setTasks(pp?.sections[section].tasks ?? []))
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === placeId)
      setTasks(p2?.sections[section].tasks ?? [])
    })
    return unsub
  }, [placeId, section])

  function refresh() {
    const p = getPlace(placeId)
    setTasks(p?.sections[section].tasks ?? [])
  }

  function add() {
    const text = input.trim()
    if (!text) return
    addTask(placeId, text, section)
    setInput('')
    refresh()
  }

  function onToggle(id: string, done: boolean) {
    toggleTask(placeId, id, done, section)
    refresh()
  }

  function onUpdate(id: string, text: string) {
    updateTaskText(placeId, id, text, section)
    refresh()
  }

  function onRemove(id: string) {
    removeTask(placeId, id, section)
    refresh()
  }

  function beginDrag(id: string) {
    dragIdRef.current = id
    setDraggingId(id)
    const fromIdx = tasks.findIndex(x => x.id === id)
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
      if (Math.hypot(dx, dy) > 6) clearTimers()
      return
    }
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
      const fromIdx = tasks.findIndex(x => x.id === dragIdRef.current)
      if (fromIdx >= 0 && fromIdx < target) target = target - 1
      reorderTasks(placeId, dragIdRef.current, target, section)
      refresh()
    }
    dragIdRef.current = null
    overIndexRef.current = -1
    setDraggingId(null)
    setInsertIndex(-1)
    startPosRef.current = null
  }

  function onDragStart(id: string) {
    dragIdRef.current = id
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function onDrop(targetIndex: number) {
    const sourceId = dragIdRef.current
    if (!sourceId) return
    reorderTasks(placeId, sourceId, targetIndex, section)
    dragIdRef.current = null
    refresh()
  }

  return (
    <div className="card p-3 space-y-3" style={{ background: '#fff' }}>
      <div className="text-sm text-slate-500">{section === 'tasks' ? 'やることリスト' : 'バラシ手順（チェックリスト）'}</div>
      <div className="space-y-2" ref={containerRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        {tasks.length === 0 ? (
          <div className="text-slate-500 text-sm">{section === 'tasks' ? 'まだタスクがありません' : 'まだ項目がありません'}</div>
        ) : tasks.map((t, i) => (
          <div
            key={t.id}
            data-row="1"
            className={`flex flex-col gap-2 rounded border bg-white transition-colors ${draggingId === t.id ? '!border-violet-300 bg-violet-50 cursor-grabbing shadow' : 'cursor-grab'}`}
            onPointerDown={(e) => onPointerDown(e, t.id)}
            title="長押しして上下にドラッグで並び替え"
          >
            {draggingId && insertIndex === i && (
              <div className="h-0.5 -mt-1 rounded bg-indigo-400" />
            )}
            <div className="flex items-center gap-2 p-2 w-full">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={t.done}
                onChange={e => onToggle(t.id, e.target.checked)}
              />
              <input
                className="flex-1 bg-transparent outline-none"
                value={t.text}
                onChange={e => onUpdate(t.id, e.target.value)}
              />
              {admin && (
                <button className="btn-secondary" onClick={() => onRemove(t.id)}>削除</button>
              )}
            </div>
            {draggingId && insertIndex === i + 1 && (
              <div className="h-0.5 mb-1 rounded bg-indigo-400" />
            )}
          </div>
        ))}
        {draggingId && insertIndex === tasks.length && (
          <div className="h-0.5 rounded bg-indigo-400" />
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={section === 'tasks' ? 'タスクを入力して追加' : 'バラシ項目を入力して追加'}
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button className="btn" onClick={add}>追加</button>
      </div>
    </div>
  )
}
