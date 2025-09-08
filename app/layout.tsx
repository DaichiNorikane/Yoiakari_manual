import './globals.css'
import type { Metadata } from 'next'
import SharedBadge from '@/components/SharedBadge'

export const metadata: Metadata = {
  title: '現場マニュアル',
  description: '場所ごとの機材・やること・繋ぎ方・バラシ方を管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
