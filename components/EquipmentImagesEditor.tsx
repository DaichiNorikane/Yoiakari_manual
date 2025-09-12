"use client"
import { useEffect, useState, useMemo } from 'react'
import { addEquipmentImages, getPlace, getPlaceAsync, removeEquipmentImage, subscribePlaces } from '@/lib/storage'
import { useAdmin } from '@/lib/auth'
import Lightbox from '@/components/Lightbox'

export default function EquipmentImagesEditor({ placeId, equipmentId }: { placeId: string, equipmentId: string }) {
  const [name, setName] = useState('')
  const [images, setImages] = useState<{ id: string; name: string; dataUrl: string; url?: string }[]>([])
  const admin = useAdmin()
  const [viewIndex, setViewIndex] = useState<number>(-1)
  const lightboxImages = useMemo(() => images.map(i => ({ src: i.url || i.dataUrl, alt: i.name })), [images])

  useEffect(() => {
    const p = getPlace(placeId)
    const e = p?.sections.equipment.equipments?.find(e => e.id === equipmentId)
    if (e) {
      setName(e.text)
      setImages(e.images ?? [])
    }
    getPlaceAsync(placeId).then(pp => {
      const ee = pp?.sections.equipment.equipments?.find(e => e.id === equipmentId)
      if (ee) {
        setName(ee.text)
        setImages(ee.images ?? [])
      }
    })
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === placeId)
      const e2 = p2?.sections.equipment.equipments?.find(e => e.id === equipmentId)
      if (e2) setImages(e2.images ?? [])
    })
    return unsub
  }, [placeId, equipmentId])

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    await addEquipmentImages(placeId, equipmentId, Array.from(files))
    const p = getPlace(placeId)
    const e = p?.sections.equipment.equipments?.find(e => e.id === equipmentId)
    if (e) setImages(e.images ?? [])
  }

  function onRemove(id: string) {
    removeEquipmentImage(placeId, equipmentId, id)
    const p = getPlace(placeId)
    const e = p?.sections.equipment.equipments?.find(e => e.id === equipmentId)
    if (e) setImages(e.images ?? [])
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500">機材: {name}</div>
      <div className="card p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">画像</div>
          <label className="btn-secondary cursor-pointer">
            画像を追加
            <input type="file" accept="image/*" multiple className="hidden" onChange={e => onFilesSelected(e.target.files)} />
          </label>
        </div>
        {images.length === 0 ? (
          <div className="text-slate-500 text-sm mt-2">画像はまだありません</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
            {images.map((img, idx) => (
              <div key={img.id} className="relative group">
                <img src={img.url || img.dataUrl} alt={img.name} className="w-full h-32 object-cover rounded-lg border cursor-zoom-in" onClick={() => setViewIndex(idx)} />
                {admin && (
                  <button className="absolute top-2 right-2 btn-secondary !px-2 !py-1 opacity-90" onClick={() => onRemove(img.id)}>削除</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {viewIndex >= 0 && (
        <Lightbox
          images={lightboxImages}
          index={viewIndex}
          onClose={() => setViewIndex(-1)}
          onPrev={() => setViewIndex((i) => (i - 1 + images.length) % images.length)}
          onNext={() => setViewIndex((i) => (i + 1) % images.length)}
        />
      )}
    </div>
  )
}
