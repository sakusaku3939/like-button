# いいねボタン
プレゼン発表中にリアルタイムで「いいね！」が送れるシステム。  
高校の情報科発表会2022で使用しました。  
https://sakusaku3939.com/posts/like-button

![いいねボタン - Google Chrome 2022-02-17 09-31-51](https://user-images.githubusercontent.com/53967490/158470214-1470f4e6-d392-47a5-a61c-3a313f15455a.jpg)

## 開発・検証

Node.js 18.12 以上が必要です。CI では Node.js 22 / 24 を使用します。

```sh
npm ci
npm run lint -- --no-fix
npm run test:dependencies
npm run build
```

起動・ビルドには `src/config/firebase-config.js` に Firebase の設定を用意してください。
このファイルは Git の管理対象外です。CI ではビルド確認用のダミー設定を生成します。

### セキュリティ更新の overrides

- Firestore が要求する `@grpc/grpc-js ~1.9.0` を、修正版の `1.13.6` に限定して上書きしています。
- Vue CLI の webpack-dev-server 4 が要求する webpack-dev-middleware 5 を、修正版の `7.4.6` に限定して上書きしています。
  [パストラバーサルの修正](https://github.com/webpack/webpack-dev-middleware/releases/tag/v7.4.6)を含むため、`7.4.5` は使用しません。

`test:dependencies` は、ローカルの gRPC スタブによる Firestore のエラー処理と、開発サーバーの配信・再ビルド・パストラバーサル防止を確認します。
実際の Firebase 接続、ブラウザーの HMR、認証・いいね送信などの画面操作は検証対象に含みません。
Firebase / Vue CLI の依存条件が修正版に対応したら、overrides の削除を検討してください。
ほかの依存パッケージには既存の `npm audit` の指摘が残ります。

©2021 sakusaku3939
