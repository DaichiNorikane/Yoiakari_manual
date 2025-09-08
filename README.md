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

共有モード（全ユーザーで同じデータを共有）
- Supabase を使った「共有モード」を用意しています。以下の準備で有効化されます。
  1. Supabase プロジェクトを作成
  2. テーブル作成（SQL）:
     ```sql
     create table if not exists manual_docs (
       id text primary key,
       data jsonb
     );
     -- RLS を無効化するか、anon の read/write を許可するポリシーを設定
     alter table manual_docs disable row level security;
     ```
  3. Vercel の Project Settings → Environment Variables に設定
     - `NEXT_PUBLIC_SUPABASE_URL` = Supabase の URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public key
  4. 再デプロイ

- ONになると、アプリは `manual_docs` テーブルの `id='default'` 行に JSON 全体を保存/読込します。
- クライアント側は localStorage をキャッシュとして使用し、表示直後にリモートの内容で自動更新します。
