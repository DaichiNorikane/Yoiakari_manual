"use client"
import Link from 'next/link'
import { useParams } from 'next/navigation'
import TaskImagesEditor from '@/components/TaskImagesEditor'

export default function TaskImagesPage() {
  const params = useParams<{ id: string, tid: string }>()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/place/${params.id}/tasks`} className="btn-secondary">← やることへ</Link>
      </div>
      <TaskImagesEditor placeId={params.id} taskId={params.tid} />
    </div>
  )
}

