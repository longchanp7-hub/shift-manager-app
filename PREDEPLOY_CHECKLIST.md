# デプロイ直前チェックリスト

## 現在の状態

- [x] GitHub Pages公開対象を `site/` に分離
- [x] `index.html` / `manifest.webmanifest` / `sw.js` / PWAアイコンを配置
- [x] PWA用アイコン 192px / 512px を確認
- [x] manifest JSONを検証
- [x] HTML内の相対パスを検証
- [x] インラインJavaScriptの構文を検証
- [x] Service Workerのキャッシュ対象を検証
- [x] v2の主要機能マーカーを確認
- [x] 通常pushでは自動デプロイしない構成
- [x] GitHub Pagesデプロイは手動実行のみ

## GitHubへpushした後に確認する項目

1. Actions の `Pre-deploy checks` が成功していること
2. `Deploy GitHub Pages` が**まだ実行されていない**こと
3. `Settings > Pages` の Source を `GitHub Actions` にすること
4. 公開直前に `site/index.html` のUIと仕様を最終確認すること
5. 問題なければ `Actions > Deploy GitHub Pages > Run workflow` を実行すること

## 公開後の最終確認

- PWAインストール可能
- 従業員追加・編集・削除
- シフト追加・編集・削除
- 週/月/一覧切替
- 翌週コピー
- 必要人数不足チェック
- 出勤可能時間警告
- CSV出力
- バックアップ/復元
- 再読み込み後も保存データが残る
- オフライン再起動
