# デプロイ直前チェックリスト

## 現在の停止位置

**まだGitHub Pagesへ公開しない。**
通常のpushでは検証CIだけが動き、Pagesデプロイは手動実行しない限り開始されない。

確認済みリポジトリ: `longchanp7-hub/shift-manager-app`

## GitHub上で確認する項目

- [x] リポジトリ名が `shift-manager-app`（末尾ハイフンなし）
- [ ] 最新の `Pre-deploy checks` が緑（PASS）
- [x] `site/index.html` がv2構成
- [x] `site/manifest.webmanifest` と192/512pxアイコンがある
- [x] `site/sw.js` がある
- [x] `.github/workflows/deploy-pages.yml` のトリガーが `workflow_dispatch` のみ
- [x] PWAの `start_url` / `scope` / Service Worker資産参照が相対パス
- [x] GitHub Pagesはまだ未公開

## 公開ボタンを押す直前

- [ ] `Settings > Pages > Source = GitHub Actions`
- [ ] `Actions > Deploy GitHub Pages` を開く
- [ ] `Run workflow` を押す前にmainの最新コミットを確認

> 現在GitHub API上の `has_pages` は `false`。そのため初回公開前に Source を GitHub Actions に設定する必要がある。

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
