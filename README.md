# いいねボタン
プレゼン発表中にリアルタイムで「いいね！」が送れるシステム。  
高校の情報科発表会2022で使用しました。  
https://sakusaku3939.com/posts/like-button

![いいねボタン - Google Chrome 2022-02-17 09-31-51](https://user-images.githubusercontent.com/53967490/158470214-1470f4e6-d392-47a5-a61c-3a313f15455a.jpg)

## 開発・検証

Node.js 18.12 以上が必要です。CI では最小バージョンの Node.js 18.12.0 と Node.js 22 / 24 を検証します。通常の開発にはサポート中の Node.js 22 / 24 を推奨します。

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

- SockJS 0.3.24 が要求する `uuid ^8.3.2` は、`vendor/sockjs-uuid` のローカルアダプターで置き換えています。
  SockJS が実際に使用する引数なしの `v4()` だけを Node.js 標準の `crypto.randomUUID()` で実装します。
  `uuid` 14 は ESM 専用のため、直接の上書きでは CommonJS を使用する SockJS の Node.js 18 互換性を維持できません。
  ルートの開発用依存 `uuid` はこのローカルパッケージへの参照であり、npm の `uuid` パッケージはインストールしません。
  上書きは SockJS 0.3.24 に限定し、新しい呼び出し方や別の依存元が加わった場合はテストで検出します。
  アダプターに外部コードのコピーや追加依存はなく、SockJS 本体とその MIT ライセンスは変更しません。
  SockJS が修正版の依存条件に対応したら、このアダプター・開発用依存 `uuid`・対応する override をまとめて削除してください。

`test:dependencies` は、ローカルの gRPC スタブによる Firestore のエラー処理と、開発サーバーの配信・再ビルド・パストラバーサル防止、SockJS の UUID 生成・メッセージ送受信・再接続を確認します。
実際の Firebase 接続、ブラウザーの HMR、認証・いいね送信などの画面操作は検証対象に含みません。
Firebase / Vue CLI の依存条件が修正版に対応したら、overrides の削除を検討してください。
ほかの依存パッケージには既存の `npm audit` の指摘が残ります。

©2021 sakusaku3939
