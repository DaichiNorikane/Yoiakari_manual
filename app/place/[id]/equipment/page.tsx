"use client"
import EquipmentEditor from '@/components/EquipmentEditor'
import { useParams } from 'next/navigation'

export default function EquipmentPage() {
  const params = useParams<{ id: string }>()
  return <EquipmentEditor placeId={params.id} />
}
