"use client"
import { useEffect, useMemo, useState } from 'react'
import { addImages, getPlace, getPlaceAsync, removeImage, updateSectionText, subscribePlaces } from '@/lib/storage'
import { SectionKey } from '@/types'
import { simpleMarkdown } from '@/lib/markdown'
import Lightbox from '@/components/Lightbox'

export default function SectionEditor({ placeId, section }: { placeId: string, section: SectionKey }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<{ id: string, name: string, dataUrl: string }[]>([])
  const [viewIndex, setViewIndex] = useState<number>(-1)

  useEffect(() => {
    const p = getPlace(placeId)
    if (p) {
      setText(p.sections[section].text)
      setImages(p.sections[section].images)
    }
    // refresh from shared storage
    getPlaceAsync(placeId).then(pp => {
      if (pp) {
        setText(pp.sections[section].text)
        setImages(pp.sections[section].images)
      }
    })
    const unsub = subscribePlaces(list => {
      const p2 = list.find(p => p.id === placeId)
      if (p2) {
        setText(p2.sections[section].text)
        setImages(p2.sections[section].images)
      }
    })
    return unsub
  }, [placeId, section])

  const preview = useMemo(() => simpleMarkdown(text), [text])

  function onChangeText(v: string) {
    setText(v)
    updateSectionText(placeId, section, v)
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return
    await addImages(placeId, section, Array.from(files))
    const p = getPlace(placeId)
    if (p) setImages(p.sections[section].images)
  }

  function onRemoveImage(imageId: string) {
    removeImage(placeId, section, imageId)
    const p = getPlace(placeId)
    if (p) setImages(p.sections[section].images)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-3">
          <div className="text-sm text-slate-500 mb-2">テキスト（Markdown可）</div>
          <textarea
            className="input h-64"
            placeholder="# 見出し\n- 箇条書き\n**太字** や *斜体*、`コード`"
            value={text}
            onChange={e => onChangeText(e.target.value)}
          />
        </div>
        <div className="card p-3">
          <div className="text-sm text-slate-500 mb-2">プレビュー</div>
          <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      </div>

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
                <img src={img.dataUrl} alt={img.name} className="w-full h-32 object-cover rounded-lg border cursor-zoom-in" onClick={() => setViewIndex(idx)} />
                <button className="absolute top-2 right-2 btn-secondary !px-2 !py-1 opacity-90" onClick={() => onRemoveImage(img.id)}>削除</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {viewIndex >= 0 && (
        <Lightbox
          images={images.map(i => ({ src: i.dataUrl, alt: i.name }))}
          index={viewIndex}
          onClose={() => setViewIndex(-1)}
          onPrev={() => setViewIndex((i) => (i - 1 + images.length) % images.length)}
          onNext={() => setViewIndex((i) => (i + 1) % images.length)}
        />
      )}
    </div>
  )
}
