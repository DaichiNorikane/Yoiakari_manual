"use client"
import TasksEditor from '@/components/TasksEditor'
import ImagesEditor from '@/components/ImagesEditor'
import { useParams } from 'next/navigation'

export default function TasksPage() {
  const params = useParams<{ id: string }>()
  return (
    <div className="space-y-4">
      <TasksEditor placeId={params.id} />
      <ImagesEditor placeId={params.id} section="tasks" />
    </div>
  )
}
