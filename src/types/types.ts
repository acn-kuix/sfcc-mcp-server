/**
 * SFCC MCPサーバー用型定義
 *
 * このモジュールにはSFCC（Salesforce B2C Commerce Cloud）MCPサーバー
 * アプリケーション全体で使用されるすべてのTypeScriptインターフェースと型が含まれています。
 */

/**
 * SFCC接続用の設定インターフェース
 * 基本認証（ユーザー名/パスワード）とOAuth（clientId/clientSecret）の両方をサポート
 */
export interface SFCCConfig {
  /** SFCCホスト名（例: zziu-006.dx.commercecloud.salesforce.com） */
  hostname?: string;
  /** 基本認証用のユーザー名（OAuth使用時はオプション） */
  username?: string;
  /** 基本認証用のパスワード（OAuth使用時はオプション） */
  password?: string;
  /** OAuth認証用のクライアントID（基本認証使用時はオプション） */
  clientId?: string;
  /** OAuth認証用のクライアントシークレット（基本認証使用時はオプション） */
  clientSecret?: string;
  /** SFCCインスタンスのサイトID */
  siteId?: string;
  /** SCAPI用のショートコード（Business Managerから取得） */
  shortCode?: string;
  /** SCAPI用の組織ID */
  organizationId?: string;
}

/**
 * dw.jsonファイルからの設定構造
 * 標準的なSalesforce Commerce Cloud dw.json設定形式に対応
 */
export interface DwJsonConfig {
  /** SFCCホスト名 */
  hostname: string;
  /** WebDAVアクセス用のユーザー名 */
  username: string;
  /** WebDAVアクセス用のパスワード */
  password: string;
  /** オプションのコードバージョン */
  'code-version'?: string;
  /** オプションのOAuth用クライアントID */
  'client-id'?: string;
  /** オプションのOAuth用クライアントシークレット */
  'client-secret'?: string;
  /** オプションのSFCCインスタンス用サイトID */
  'site-id'?: string;
  /** オプションのSCAPI用ショートコード */
  'short-code'?: string;
  /** オプションのSCAPI用組織ID */
  'organization-id'?: string;
}

/**
 * SFCCログシステムでサポートされるログレベル
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * ログファイルメタデータの構造
 */
export interface LogFileInfo {
  /** ファイル名 */
  name: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** 最終更新タイムスタンプ */
  lastModified: string;
}

/**
 * ログ分析用のサマリー統計
 */
export interface LogSummary {
  /** サマリー対象のログの日付 */
  date: string;
  /** 検出されたエラーエントリ数 */
  errorCount: number;
  /** 検出された警告エントリ数 */
  warningCount: number;
  /** 検出された情報エントリ数 */
  infoCount: number;
  /** 検出されたデバッグエントリ数 */
  debugCount: number;
  /** 識別された一意のエラーパターンのリスト */
  keyIssues: string[];
  /** 分析されたログファイルのリスト */
  files: string[];
}

/**
 * SFCC認可サーバーからのOAuth 2.0トークンレスポンス
 */
export interface OAuthTokenResponse {
  /** トークン有効期限（秒） */
  expires_in: number;
  /** トークンタイプ（SFCCでは常に"Bearer"） */
  token_type: string;
  /** 実際のアクセストークン */
  access_token: string;
}

/**
 * 有効期限追跡付きOAuthトークン
 */
export interface OAuthToken {
  /** アクセストークン */
  accessToken: string;
  /** トークンタイプ */
  tokenType: string;
  /** トークンの有効期限（タイムスタンプ） */
  expiresAt: number;
}

/**
 * OCAPIクライアント設定
 */
export interface OCAPIConfig {
  /** SFCCホスト名 */
  hostname: string;
  /** OAuthクライアントID */
  clientId: string;
  /** OAuthクライアントシークレット */
  clientSecret: string;
  /** サイトID（オプション、Shop API用） */
  siteId?: string;
  /** APIバージョン（デフォルト: v21_3） */
  version?: string;
}

/**
 * エンドポイントパラメータ定義
 */
export interface EndpointParam {
  /** パラメータ名 */
  name: string;
  /** パラメータの説明 */
  description: string;
  /** パラメータタイプ（string, number, boolean, object） */
  type: string;
  /** パラメータが必須かどうか */
  required: boolean;
}

/**
 * OCAPI/SCAPI用のAPIエンドポイント定義
 */
export interface Endpoint {
  /** エンドポイントの一意のツール名 */
  toolName: string;
  /** パスパラメータ付きのAPIパス（例: /products/{product_id}） */
  path: string;
  /** 人間可読な説明 */
  description: string;
  /** HTTPメソッド（GET, POST, PUT, PATCH, DELETE） */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** パラメータ定義 */
  parameters: EndpointParam[];
  /** POST/PUT/PATCH用のデフォルトリクエストボディ */
  defaultBody?: Record<string, any>;
  /** APIタイプ: Data APIは'ocapi'、Shopper APIは'scapi' */
  apiType: 'ocapi' | 'scapi';
  /** このエンドポイントがsite_idを必要とするかどうか */
  requiresSiteId?: boolean;
}

/**
 * OCAPI設定を拡張するSCAPI設定
 */
export interface SCAPIConfig extends OCAPIConfig {
  /** SCAPI用のショートコード（Business Managerから取得） */
  shortCode?: string;
  /** SCAPI用の組織ID */
  organizationId?: string;
}

/**
 * Data APIリクエストパラメータ
 */
export interface DataAPIRequestParams {
  /** URLで置換するパスパラメータ */
  pathParams?: Record<string, string>;
  /** クエリパラメータ */
  queryParams?: Record<string, string | number | boolean>;
  /** POST/PUT/PATCH用のリクエストボディ */
  body?: Record<string, any>;
}

/**
 * Data APIレスポンスラッパー
 */
export interface DataAPIResponse<T = any> {
  /** レスポンスデータ */
  data: T;
  /** HTTPステータスコード */
  status: number;
  /** リクエストが成功したかどうか */
  success: boolean;
  /** 失敗時のエラーメッセージ */
  error?: string;
}
