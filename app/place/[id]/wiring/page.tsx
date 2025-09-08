"use client"
import ImagesEditor from '@/components/ImagesEditor'
import { useParams } from 'next/navigation'

export default function WiringPage() {
  const params = useParams<{ id: string }>()
  return <ImagesEditor placeId={params.id} section="wiring" />
}
