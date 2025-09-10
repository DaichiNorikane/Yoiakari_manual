"use client"
import Link from 'next/link'
import { useParams } from 'next/navigation'
import EquipmentImagesEditor from '@/components/EquipmentImagesEditor'

export default function EquipmentImagesPage() {
  const params = useParams<{ id: string, eid: string }>()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/place/${params.id}/equipment`} className="btn-secondary">← 機材リストへ</Link>
      </div>
      <EquipmentImagesEditor placeId={params.id} equipmentId={params.eid} />
    </div>
  )
}

