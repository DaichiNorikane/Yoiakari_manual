"use client"
import SectionEditor from '@/components/SectionEditor'
import { useParams } from 'next/navigation'

export default function TeardownPage() {
  const params = useParams<{ id: string }>()
  return (
    <SectionEditor placeId={params.id} section="teardown" />
  )
}

