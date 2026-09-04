# かんたんシフト管理

10人以下を想定した、サーバー不要の軽量シフト管理PWAです。データは端末のブラウザ（localStorage）に保存します。

## 実装済み

- 従業員登録・編集・削除
- 曜日別の出勤可否・出勤可能時間
- 週 / 月 / 一覧表示
- 勤務 / 休み / 希望休 / 有給 / 未定
- 今週から翌週への一括コピー
- 個人別勤務回数・勤務時間集計
- 曜日・時間帯別の必要人数設定
- 30分単位の必要人数不足チェック
- 出勤可能時間外の警告
- CSV出力 / 印刷・PDF保存
- JSONバックアップ / 復元
- 元に戻す（最大15操作）
- PWA / オフライン対応
- プッシュ通知なし

## GitHub Pages公開前の状態

このリポジトリは意図的に **自動デプロイを無効** にしています。

- `verify.yml`: mainへのpush/PRで検証のみ実行
- `deploy-pages.yml`: `workflow_dispatch` の手動実行だけで公開
- 公開対象: `site/`

ローカル検証:

```bash
python3 scripts/predeploy_check.py
```

## 公開するとき

1. GitHubの `Settings > Pages` で Source を **GitHub Actions** にする
2. `Actions > Deploy GitHub Pages > Run workflow` を実行する
3. 公開URLでPWA・追加/編集/保存・再読込を最終確認する

`deploy-pages.yml` はGitHub公式のPages用Actions構成に合わせています。
