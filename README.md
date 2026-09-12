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

## GitHub Pages

公開先: `https://longchanp7-hub.github.io/shift-manager-app/`

通常のmainへのpushでは公開されません。公開は明示操作だけです。

## Androidアプリ

`android/` に Galaxy 向けの薄いアプリラッパーがあります。中身は GitHub Pages のPWAです。

1. Android Studio で `android/` を開く
2. 実機で Run するとホーム画面アプリになる
3. ChromeのPWAとAPKは保存領域が別なので、移行時はJSONバックアップを使う

詳細は `android/README.md`。
