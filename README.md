# SFCC 開発 MCP サーバー

[![npm version](https://badge.fury.io/js/sfcc-dev-mcp.svg)](https://badge.fury.io/js/sfcc-dev-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Salesforce B2C Commerce Cloud の開発ツール、ドキュメント、ベストプラクティスへの包括的なアクセスを提供する、AI対応の Model Context Protocol (MCP) サーバーです。

## 主な機能

- **完全な SFCC ドキュメントアクセス** - すべての SFCC API クラスとメソッドを検索・探索
- **ベストプラクティスガイド** - カートリッジ、フック、コントローラー、クライアントサイド JavaScript などの厳選された開発ガイドライン
- **SFRA ドキュメント** - Storefront Reference Architecture ドキュメントへの強化されたアクセス
- **ログ分析ツール** - SFCC インスタンスのリアルタイムエラー監視、デバッグ、ジョブログ分析
- **システムオブジェクト定義** - カスタム属性とサイト設定の探索
- **OCAPI Data API** - OCAPI 経由で製品、カタログ、顧客、注文などにアクセス
- **SCAPI サポート** - Shopper Commerce API 統合対応

## クイックスタート

### オプション1: ドキュメント専用モード（SFCC 認証情報不要）
```json
{
  "mcpServers": {
    "sfcc-dev": {
      "command": "npx",
      "args": ["sfcc-mcp-server"]
    }
  }
}
```

### オプション2: フルモード（ログとジョブ分析用の SFCC 認証情報が必要）
```json
{
  "mcpServers": {
    "sfcc-dev": {
      "command": "npx",
      "args": ["sfcc-mcp-server", "--dw-json", "/path/to/your/dw.json"]
    }
  }
}
```

SFCC 認証情報を含む `dw.json` ファイルを作成してください:
```json
{
  "hostname": "your-instance.sandbox.us01.dx.commercecloud.salesforce.com",
  "username": "your-username",
  "password": "your-password",
  "client-id": "your-client-id",
  "client-secret": "your-client-secret",
  "site-id": "RefArch"
}
```

## 動作モード

| モード | 利用可能なツール | SFCC 認証情報の要否 |
|------|----------------|---------------------------|
| **ドキュメント専用** | 14 ツール | 不要 |
| **フルモード** | 63 ツール | 必要 |

### ドキュメント専用モード
学習と開発に最適 - SFCC インスタンス不要:
- 完全な SFCC API ドキュメント（5 ツール）
- ベストプラクティスガイド（4 ツール）- カートリッジ、クライアントサイド JavaScript、コントローラー、フック、セキュリティ/パフォーマンス
- SFRA ドキュメント（5 ツール）

### フルモード
ライブ SFCC インスタンスアクセスを含む完全な開発体験:
- すべてのドキュメント専用機能（14 ツール）
- リアルタイムログ分析（13 ツール）
- ジョブログ分析（5 ツール）
- システムオブジェクト定義（6 ツール）
- コードバージョン管理（2 ツール）
- **新機能: OCAPI Data API ツール（28 ツール）**

## OCAPI Data API ツール

フルモードには包括的な OCAPI Data API アクセスが含まれます:

### 製品 & カタログ
- `search_products` - フィルター付きで製品を検索
- `get_product` - 製品詳細を取得
- `get_catalogs` / `get_catalog` - カタログ一覧と詳細表示
- `get_categories` / `get_category` - カテゴリ階層をブラウズ

### サイト & 設定
- `get_sites` / `get_site` - サイト一覧と詳細表示
- `get_locales` / `get_currencies` - ロケールと通貨情報を取得
- `get_price_books` / `get_price_book` - 価格表管理

### マーケティング
- `search_campaigns` / `get_campaign` - キャンペーン管理
- `search_promotions` - プロモーション検索
- `search_coupons` - クーポン管理

### 在庫
- `get_inventory_lists` / `get_inventory_list` - 在庫リスト管理
- `get_product_inventory` - 製品在庫レベル

### 顧客 & 注文
- `search_customers` / `get_customer` - 顧客検索
- `get_customer_groups` - 顧客セグメンテーション
- `search_orders` / `get_order` - 注文管理

### カスタムオブジェクト & コンテンツ
- `search_custom_objects` / `get_custom_object` - カスタムオブジェクトクエリ
- `get_content_assets` / `get_content_asset` - コンテンツ管理

## アーキテクチャ概要

このサーバーは、ツールルーティングとドメインロジックを明確に分離する**機能ゲート付きモジュラーハンドラーアーキテクチャ**を中心に構築されています:

### コアレイヤー
- **ツール定義** (`src/core/tool-definitions.ts`): カテゴリ別にグループ化された宣言的スキーマ（ドキュメント、ベストプラクティス、SFRA、ログ、ジョブログ、システムオブジェクト、コードバージョン、Data API）。
- **ハンドラー** (`src/core/handlers/*.ts`): 各カテゴリには、タイミング、構造化ログ、エラー正規化のための共通ベースを拡張するハンドラーがあります（例: `log-handler`、`docs-handler`、`system-object-handler`、`data-api-handler`）。
- **クライアント** (`src/clients/`): ドメイン操作（OCAPI、SFRA ドキュメント、ベストプラクティス、モジュラーログ分析、Data API）をカプセル化。ハンドラーはこれらに委譲し、オーケストレーションと計算を分離します。
- **サービス** (`src/services/`): ファイルシステムとパス操作のための依存性注入された抽象化 - テスト容易性を向上させ、副作用を分離します。
- **モジュラーログシステム** (`src/clients/logs/`): Reader（範囲/テール最適化）、discovery、processor（行 -> 構造化エントリ）、analyzer（パターン & ヘルス）、formatter（人間可読出力）で保守可能な進化を実現。
- **設定ファクトリー** (`src/config/configuration-factory.ts`): 提供された認証情報に基づいて機能（`canAccessLogs`、`canAccessOCAPI`）を決定し、それに応じて公開ツールをフィルタリング（最小権限の原則）。
- **エンドポイントローダー** (`src/utils/endpoint-loader.ts`): `endpoints.json` から OCAPI/SCAPI エンドポイント定義を動的にロード。

### なぜこれが重要か
- **拡張性**: 新しいツールの追加は通常、スキーマ + 最小限のハンドラーロジックの追加を意味します（新しいドメインの場合は新しいハンドラー）。
- **セキュリティ**: 認証情報を必要とするツールは、機能フラグが false の場合は公開されません。
- **テスト容易性**: ユニットテストはクライアント & モジュールを対象とし、統合/MCP テストはハンドラーのルーティングとレスポンス構造を検証します。
- **パフォーマンス**: テールログ読み取り + 軽量キャッシュ（`cache.ts`、`log-cache.ts`）により不要な I/O を削減。

### 新しいツールの追加（概要）
1. `tool-definitions.ts` の正しいエクスポート配列にスキーマオブジェクトを追加。
2. クライアント/サービスにドメインロジックを実装（ハンドラーの肥大化を避ける）。
3. 既存のハンドラーを拡張するか、新しいカテゴリの場合は新しいハンドラーを作成。
4. （新しいカテゴリの場合のみ）`server.ts` の `registerHandlers()` 内に新しいハンドラーを登録。
5. テストを書く前に `npx mcp-aegis query` で実際のレスポンス形状を確認。
6. Jest ユニットテスト + YAML MCP テストを追加（認証情報が必要な場合はドキュメント vs フルモード）。
7. ドキュメントを更新（開発ガイド + README が変更された場合は README も）。

> より詳細な内部ビューについては、ドキュメントサイトの開発ガイドを参照してください。

## AI インターフェースセットアップ

お好みの AI アシスタントを選択してください:

| インターフェース | 最適な用途 | セットアップガイド |
|-----------|----------|-------------|
| **Claude Desktop** | マルチターン会話、デバッグ | [セットアップガイド](https://github.com/acn-kuix/sfcc-mcp-server#claude-desktop) |
| **GitHub Copilot** | VS Code 統合、インライン提案 | [セットアップガイド](https://github.com/acn-kuix/sfcc-mcp-server#github-copilot) |
| **Cursor** | モダンな AI 搭載エディター | [セットアップガイド](https://github.com/acn-kuix/sfcc-mcp-server#cursor) |

## インストール

### npx を使用（推奨）
> ヒント: `-y`（または `--yes`）を追加すると、npx がパッケージをダウンロードする前に表示する対話型プロンプトを抑制できます。これにより、AI クライアント（Claude Desktop、Copilot、Cursor）が確認待ちでハングするのを防ぎます。
```bash
# サーバーをテスト
npx -y sfcc-dev-mcp

# 設定ファイルと一緒に使用
npx -y sfcc-dev-mcp --dw-json /path/to/your/dw.json
```

### グローバルインストール
```bash
npm install -g sfcc-dev-mcp
sfcc-dev-mcp --dw-json /path/to/your/dw.json
```

## デバッグモード & ログ

### デバッグログを有効化
```bash
# 詳細なログのためにデバッグモードを有効化
npx -y sfcc-dev-mcp --debug

# または設定ファイルと一緒に
npx -y sfcc-dev-mcp --dw-json /path/to/your/dw.json --debug
```

### ログファイルの場所

サーバーはシステムの一時ディレクトリにログを書き込みます:

- **macOS**: `/var/folders/{user-id}/T/sfcc-mcp-logs/`
- **Linux**: `/tmp/sfcc-mcp-logs/`
- **Windows**: `%TEMP%\sfcc-mcp-logs\`

**作成されるログファイル:**
- `sfcc-mcp-info.log` - 一般的なアプリケーションログと起動メッセージ
- `sfcc-mcp-debug.log` - 詳細なデバッグ情報（`--debug` が有効な場合のみ）
- `sfcc-mcp-error.log` - エラーメッセージとスタックトレース
- `sfcc-mcp-warn.log` - 警告メッセージ

### ログディレクトリの場所を確認
```javascript
// 正確なパスはシステムによって異なります - 確認するには:
node -e "console.log(require('os').tmpdir() + '/sfcc-mcp-logs')"
```

## ドキュメント

**[完全なドキュメント](https://github.com/acn-kuix/sfcc-mcp-server)** - 包括的なガイドとリファレンス

クイックリンク:
- **[インストールガイド](https://github.com/acn-kuix/sfcc-mcp-server#installation)** - 詳細なインストールオプション
- **[AI インターフェースセットアップ](https://github.com/acn-kuix/sfcc-mcp-server#ai-interface-setup)** - Claude Desktop、GitHub Copilot、または Cursor の設定
- **[設定ガイド](https://github.com/acn-kuix/sfcc-mcp-server#quick-start)** - SFCC 認証情報と Data API セットアップ
- **[利用可能なツール](https://github.com/acn-kuix/sfcc-mcp-server#operating-modes)** - 完全なツールリファレンス
- **[OCAPI ツール](https://github.com/acn-kuix/sfcc-mcp-server#ocapi-data-api-tools)** - Data API リファレンス

## AI との対話例

```
ユーザー: "製品検索用の新しい SFCC コントローラーを作成して"
AI: 適切なインポート、ルート処理、SFRA パターンを含む完全なコントローラーを生成

ユーザー: "チェックアウトフローの問題は何？ログを確認して"
AI: 最近のエラーログを分析し、問題を特定し、修正を提案

ユーザー: "注文検証用の OCAPI フックの実装方法を教えて"
AI: 完全なフック実装例を含むベストプラクティスガイドを提供

ユーザー: "RefArch サイトで製品を検索して"
AI: search_products ツールを使用してカタログをクエリし、製品データを返却

ユーザー: "サイトのすべての顧客グループを取得して"
AI: get_customer_groups ツールを使用してセグメンテーションデータを取得
```

## OCAPI 設定

OCAPI Data API ツールを使用するには、`dw.json` に OAuth 認証情報を含めてください:

```json
{
  "hostname": "your-instance.sandbox.us01.dx.commercecloud.salesforce.com",
  "username": "your-username",
  "password": "your-password",
  "client-id": "your-client-id",
  "client-secret": "your-client-secret",
  "site-id": "RefArch"
}
```

### OCAPI Business Manager 設定

Business Manager で OCAPI パーミッションを設定する必要があります:

1. **Administration > Site Development > Open Commerce API Settings** に移動
2. Data API 用に以下の設定を追加:

```json
{
  "_v": "21.3",
  "clients": [
    {
      "client_id": "your-client-id",
      "resources": [
        {
          "resource_id": "/**",
          "methods": ["get", "post", "put", "patch", "delete"],
          "read_attributes": "(**)",
          "write_attributes": "(**)"
        }
      ]
    }
  ]
}
```

## セキュリティノート

- **ローカル開発フォーカス**: ローカルマシンでの個人開発者使用を想定
- **認証情報の保護**: dw.json ファイルはバージョン管理にコミットしないでください
- **ネットワークセキュリティ**: すべての API 呼び出しは適切な認証付きの HTTPS を使用
- **データ非保存**: サーバーは SFCC データをローカルに永続化しません

## 今後の計画

SFCC 開発 MCP サーバーは、エキサイティングな新機能を計画しながら継続的に改善しています:

### コントリビューションを歓迎します！

新機能や改善のアイデアがありますか？ぜひお聞かせください！

- **機能リクエスト**: イシューを開いてアイデアを議論
- **バグレポート**: 遭遇した問題を報告して改善にご協力ください
- **プルリクエスト**: コード、ドキュメント、または例を貢献
- **ドキュメント**: ガイドとベストプラクティスの拡充にご協力ください

始め方については[コントリビューティングガイド](CONTRIBUTING.md)をご覧いただくか、[オープンイシュー](https://github.com/acn-kuix/sfcc-mcp-server/issues)を確認してお手伝いできる箇所を見つけてください。

**あなたの専門知識とフィードバックが、SFCC コミュニティ全体のためにこのツールをより良くします！**

## コントリビューティング

コントリビューションを歓迎します！詳細は[コントリビューティングガイド](CONTRIBUTING.md)をご覧ください。

## ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細は [LICENSE](LICENSE) ファイルをご覧ください。

---

**AI で SFCC 開発を加速する準備はできましたか？**

**[完全なドキュメントで始める](https://github.com/acn-kuix/sfcc-mcp-server)**
