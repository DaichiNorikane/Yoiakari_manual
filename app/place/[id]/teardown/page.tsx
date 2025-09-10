"use client"
import TasksEditor from '@/components/TasksEditor'
import ImagesEditor from '@/components/ImagesEditor'
import { useParams } from 'next/navigation'

export default function TeardownPage() {
  const params = useParams<{ id: string }>()
  return (
    <div className="space-y-4">
      <TasksEditor placeId={params.id} section="teardown" />
      <ImagesEditor placeId={params.id} section="teardown" />
    </div>
  )
}
