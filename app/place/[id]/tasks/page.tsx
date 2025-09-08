"use client"
import TasksEditor from '@/components/TasksEditor'
import { useParams } from 'next/navigation'

export default function TasksPage() {
  const params = useParams<{ id: string }>()
  return <TasksEditor placeId={params.id} />
}
