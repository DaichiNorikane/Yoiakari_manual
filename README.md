現場マニュアル（簡易版）

要件に基づく Next.js アプリの最小構成です。ローカルストレージに保存し、場所タブと4小項目（機材リスト/やること/繋ぎ方/バラシ方）を備えます。画像は開発段階として base64 で localStorage に保存します。

使い方（ローカル実行）
- 依存関係をインストール: `npm install`
- 開発サーバ: `npm run dev` で `http://localhost:3000`

ページ構成
- `/` 場所の一覧＋追加/リネーム
- `/place/[id]/equipment` 機材リスト
- `/place/[id]/tasks` やること
- `/place/[id]/wiring` 繋ぎ方
- `/place/[id]/teardown` バラシ方

データ構造
```ts
type SectionKey = 'equipment' | 'tasks' | 'wiring' | 'teardown'
type Place = {
  id: string
  name: string
  sections: Record<SectionKey, { text: string; images: { id: string; name: string; dataUrl: string }[] }>
}
```

メモ
- Markdown は簡易変換（見出し/箇条書き/太字/斜体/コード/リンク）。
- 画像は複数アップロード可。削除可。localStorage に保持。
- Tailwind でカード/ボタン/入力など最低限のスタイル。

