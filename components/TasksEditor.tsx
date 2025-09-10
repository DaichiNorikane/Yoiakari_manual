"use client"
import { useEffect, useState, useRef } from 'react'
import { addTask, getPlace, getPlaceAsync, removeTask, toggleTask, updateTaskText, subscribePlaces, moveTask, reorderTasks } from '@/lib/storage'
import type { SectionKey } from '@/types'

export default function TasksEditor({ placeId, section = 'tasks' as Extract<SectionKey, 'tasks' | 'teardown'> }: { placeId: string, section?: Extract<SectionKey, 'tasks' | 'teardown'> }) {
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([])
  const [input, setInput] = useState('')
  const dragIdRef = useRef<string | null>(null)

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

  function onMove(id: string, dir: 'up' | 'down') {
    moveTask(placeId, id, dir, section)
    refresh()
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
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder={section === 'tasks' ? 'タスクを入力して追加（Enter可）' : 'バラシ項目を入力して追加（Enter可）'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
        />
        <button className="btn" onClick={add}>追加</button>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-slate-500 text-sm">{section === 'tasks' ? 'まだタスクがありません' : 'まだ項目がありません'}</div>
        ) : tasks.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-2 p-2 rounded border bg-white"
            draggable
            onDragStart={() => onDragStart(t.id)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            title="ドラッグで並び替え（モバイルは▲/▼を使用）"
          >
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
            <div className="flex gap-1">
              <button className="btn-secondary !px-2" title="上へ" onClick={() => onMove(t.id, 'up')}>▲</button>
              <button className="btn-secondary !px-2" title="下へ" onClick={() => onMove(t.id, 'down')}>▼</button>
            </div>
            <button className="btn-secondary" onClick={() => onRemove(t.id)}>削除</button>
          </div>
        ))}
      </div>
    </div>
  )
}
