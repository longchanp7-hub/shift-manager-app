# デプロイ直前チェックリスト

## 現在の停止位置

**まだGitHub Pagesへ公開しない。**
通常のpushでは検証CIだけが動き、Pagesデプロイは手動実行しない限り開始されない。

## GitHub上で確認する項目

- [ ] `Pre-deploy checks` が緑（PASS）
- [ ] `site/index.html` が意図したv2になっている
- [ ] `site/manifest.webmanifest` と2サイズのアイコンがある
- [ ] `site/sw.js` がある
- [ ] `.github/workflows/deploy-pages.yml` のトリガーが `workflow_dispatch` のみ
- [ ] GitHub PagesのSourceをまだ変更していない、または公開を実行していない

## 公開ボタンを押す直前

- [ ] Settings > Pages > Source = GitHub Actions
- [ ] Actions > Deploy GitHub Pages を開く
- [ ] Run workflow を押す前にmainの最新コミットを確認

## 公開後の最終動作確認

- [ ] 初回表示
- [ ] 従業員追加
- [ ] シフト追加・編集・削除
- [ ] 週/月/一覧切替
- [ ] 翌週コピー
- [ ] 休み/希望休/有給/未定
- [ ] 必要人数不足表示
- [ ] CSV出力
- [ ] JSONバックアップ/復元
- [ ] ページ再読込後もデータ保持
- [ ] Galaxy/iPhoneでホーム画面追加/PWA起動
