# Androidアプリ（かんたんシフト管理）

いまのPWAを、Galaxy などで「アプリ」として開ける薄いラッパーです。
サーバーは増やしていません。中身は公開中の GitHub Pages と同じです。

## できること

- ホーム画面からアプリとして起動（アドレスバーなし）
- JavaScript / localStorage が使える
- JSONバックアップのファイル選択が使える
- Z Fold の折りたたみ・分割画面で再描画する
- 戻るキーでWebView履歴を戻す

## データの注意（重要）

- Chromeやホーム画面追加のPWAと、このAPKのWebViewは **保存領域が別** です。
- 既存データを使うときは、PWA側で「バックアップ」→ APK側で「復元」してください。
- APKを消すと、そのAPK内のシフトデータも消えます。定期バックアップを推奨します。

## ビルド方法

1. Android Studio で `android/` フォルダを開く
2. JDK 17 以上
3. 実機（おすすめ）またはエミュレータで Run
4. APKが必要なら Build > Build Bundle(s) / APK(s) > Build APK(s)

パッケージ名: `jp.shiftmanager.app`

Play Store提出や署名付きリリースは、このリポジトリでは自動作成しません。
