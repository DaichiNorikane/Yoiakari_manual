"use client"
import { useEffect, useState, useMemo } from 'react'
import { addImages, getPlace, getPlaceAsync, removeImage, subscribePlaces } from '@/lib/storage'
import { SectionKey } from '@/types'
import { useAdmin } from '@/lib/auth'
import Lightbox from '@/components/Lightbox'
import { maybeSignPublicUrl } from '@/lib/supabase'

export default function ImagesEditor({ placeId, section }: { placeId: string, section: Extract<SectionKey, 'wiring' | 'tasks' | 'equipment' | 'teardown'> }) {
  const [images, setImages] = useState<{ id: string; name: string; dataUrl: string; url?: string }[]>([])
  const admin = useAdmin()
  const [viewIndex, setViewIndex] = useState<number>(-1)
  const lightboxImages = useMemo(() => images.map(i => ({ src: i.url || i.dataUrl, alt: i.name })), [images])

  useEffect(() => {
    const p = getPlace(placeId)
    if (p) setImages(p.sections[section].images)
    getPlaceAsync(placeId).then(pp => {
      if (pp) setImages(pp.sections[section].images)
    })
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === placeId)
      if (p2) setImages(p2.sections[section].images)
    })
    return unsub
  }, [placeId, section])

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    await addImages(placeId, section, Array.from(files))
    const p = getPlace(placeId)
    if (p) setImages(p.sections[section].images)
  }

  function onRemove(id: string) {
    removeImage(placeId, section, id)
    const p = getPlace(placeId)
    if (p) setImages(p.sections[section].images)
  }

  return (
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
              <img
                src={img.url || img.dataUrl}
                alt={img.name}
                className="w-full h-32 object-cover rounded-lg border cursor-zoom-in"
                onClick={() => setViewIndex(idx)}
                onError={async (e) => {
                  if (img.url) {
                    const signed = await maybeSignPublicUrl(img.url)
                    if (signed && signed !== (e.currentTarget as HTMLImageElement).src) {
                      ;(e.currentTarget as HTMLImageElement).src = signed
                      setImages(prev => prev.map((m, j) => j === idx ? { ...m, url: signed } : m))
                    }
                  }
                }}
              />
              {admin && (
                <button className="absolute top-2 right-2 btn-secondary !px-2 !py-1 opacity-90" onClick={() => onRemove(img.id)}>削除</button>
              )}
            </div>
          ))}
        </div>
      )}
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
