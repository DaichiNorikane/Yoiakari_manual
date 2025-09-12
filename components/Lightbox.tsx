"use client"
import { useEffect } from 'react'

export type LightboxImage = { src: string; alt?: string }

export default function Lightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const img = images[index]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-[95vw] max-h-[95vh]" onClick={e => e.stopPropagation()}>
        <img src={img.src} alt={img.alt || ''} className="max-w-[95vw] max-h-[85vh] object-contain rounded-xl shadow-2xl" />
        <button aria-label="close" className="absolute -top-10 right-0 btn-secondary" onClick={onClose}>閉じる</button>
        {images.length > 1 && (
          <>
            <button aria-label="prev" className="absolute left-0 top-1/2 -translate-y-1/2 btn-secondary" onClick={onPrev}>←</button>
            <button aria-label="next" className="absolute right-0 top-1/2 -translate-y-1/2 btn-secondary" onClick={onNext}>→</button>
          </>
        )}
        <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-white text-xs opacity-80">
          {index + 1} / {images.length}
        </div>
      </div>
    </div>
  )
}

