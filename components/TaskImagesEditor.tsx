"use client"
import { useEffect, useMemo, useState } from 'react'
import { addTaskImages, getPlace, getPlaceAsync, removeTaskImage, subscribePlaces } from '@/lib/storage'
import { useAdmin } from '@/lib/auth'
import Lightbox from '@/components/Lightbox'
import { maybeSignPublicUrl } from '@/lib/supabase'

export default function TaskImagesEditor({ placeId, section = 'tasks' as 'tasks' | 'teardown', taskId }: { placeId: string, section?: 'tasks' | 'teardown', taskId: string }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<{ id: string; name: string; dataUrl: string; url?: string }[]>([])
  const admin = useAdmin()
  const [viewIndex, setViewIndex] = useState<number>(-1)
  const lightboxImages = useMemo(() => images.map(i => ({ src: i.url || i.dataUrl, alt: i.name })), [images])

  useEffect(() => {
    const p = getPlace(placeId)
    const t = p?.sections[section].tasks?.find(t => t.id === taskId)
    if (t) {
      setText(t.text)
      setImages(t.images ?? [])
    }
    getPlaceAsync(placeId).then(pp => {
      const tt = pp?.sections[section].tasks?.find(t => t.id === taskId)
      if (tt) {
        setText(tt.text)
        setImages(tt.images ?? [])
      }
    })
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === placeId)
      const t2 = p2?.sections[section].tasks?.find(t => t.id === taskId)
      if (t2) setImages(t2.images ?? [])
    })
    return unsub
  }, [placeId, taskId, section])

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    await addTaskImages(placeId, section, taskId, Array.from(files))
    const p = getPlace(placeId)
    const t = p?.sections[section].tasks?.find(t => t.id === taskId)
    if (t) setImages(t.images ?? [])
  }

  function onRemove(id: string) {
    removeTaskImage(placeId, section, taskId, id)
    const p = getPlace(placeId)
    const t = p?.sections[section].tasks?.find(t => t.id === taskId)
    if (t) setImages(t.images ?? [])
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-slate-500">タスク: {text}</div>
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
