"use client"
import { useEffect, useState } from 'react'
import { addTask, getPlace, removeTask, toggleTask, updateTaskText } from '@/lib/storage'

export default function TasksEditor({ placeId }: { placeId: string }) {
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    const p = getPlace(placeId)
    setTasks(p?.sections.tasks.tasks ?? [])
  }, [placeId])

  function refresh() {
    const p = getPlace(placeId)
    setTasks(p?.sections.tasks.tasks ?? [])
  }

  function add() {
    const text = input.trim()
    if (!text) return
    addTask(placeId, text)
    setInput('')
    refresh()
  }

  function onToggle(id: string, done: boolean) {
    toggleTask(placeId, id, done)
    refresh()
  }

  function onUpdate(id: string, text: string) {
    updateTaskText(placeId, id, text)
    refresh()
  }

  function onRemove(id: string) {
    removeTask(placeId, id)
    refresh()
  }

  return (
    <div className="card p-3 space-y-3">
      <div className="text-sm text-slate-500">やることリスト</div>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="タスクを入力して追加（Enter可）"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
        />
        <button className="btn" onClick={add}>追加</button>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-slate-500 text-sm">まだタスクがありません</div>
        ) : tasks.map(t => (
          <div key={t.id} className="flex items-center gap-2 p-2 rounded border bg-white">
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
            <button className="btn-secondary" onClick={() => onRemove(t.id)}>削除</button>
          </div>
        ))}
      </div>
    </div>
  )
}

