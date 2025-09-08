import './globals.css'
import type { Metadata } from 'next'
import SharedBadge from '@/components/SharedBadge'
import { startRealtime } from '@/lib/realtime'
import { useEffect } from 'react'

export const metadata: Metadata = {
  title: '現場マニュアル',
  description: '場所ごとの機材・やること・繋ぎ方・バラシ方を管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // client-side realtime init
  useEffect(() => {
    startRealtime()
  }, [])
  return (
    <html lang="ja">
      <body className="text-ink">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 relative">
          {children}
        </div>
        <SharedBadge />
      </body>
    </html>
  )
}
