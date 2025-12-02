/**
 * SFCC MCPサーバー用設定ファクトリー
 *
 * バリデーションとデフォルト値を備えた集中型設定管理。
 * このファクトリーは、configモジュールからのセキュアなファイル読み込みを
 * 活用しながら、様々なソースからSFCCConfigオブジェクトを作成します。
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { SFCCConfig, DwJsonConfig } from '../types/types.js';
import { loadSecureDwJson } from './dw-json-loader.js';

export class ConfigurationFactory {
  /**
   * 適切なバリデーションを行いながら様々なソースから設定を作成
   */
  static create(options: {
    dwJsonPath?: string;
    hostname?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    siteId?: string;
    shortCode?: string;
    organizationId?: string;
  }): SFCCConfig {
    let config: SFCCConfig;

    // パスが提供されている場合はdw.jsonからロード
    if (options.dwJsonPath) {
      const dwConfig = this.loadFromDwJson(options.dwJsonPath);
      config = this.mapDwJsonToConfig(dwConfig);
    } else {
      // 提供されたオプションから作成
      config = {
        hostname: options.hostname ?? '',
        username: options.username,
        password: options.password,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        siteId: options.siteId,
        shortCode: options.shortCode,
        organizationId: options.organizationId,
      };
    }

    // 提供されたオプションで上書き（コマンドライン引数が優先）
    if (options.hostname) {config.hostname = options.hostname;}
    if (options.username) {config.username = options.username;}
    if (options.password) {config.password = options.password;}
    if (options.clientId) {config.clientId = options.clientId;}
    if (options.clientSecret) {config.clientSecret = options.clientSecret;}
    if (options.siteId) {config.siteId = options.siteId;}
    if (options.shortCode) {config.shortCode = options.shortCode;}
    if (options.organizationId) {config.organizationId = options.organizationId;}

    this.validate(config);
    return config;
  }

  /**
   * セキュアなファイル読み込みを使用してdw.jsonファイルから設定をロード
   *
   * @param dwJsonPath - dw.jsonファイルへのパス
   * @returns パースされたdw.json設定
   * @throws ファイルが読み込めないか無効な場合はエラー
   */
  private static loadFromDwJson(dwJsonPath: string): DwJsonConfig {
    const resolvedPath = resolve(dwJsonPath);

    if (!existsSync(resolvedPath)) {
      throw new Error(`dw.json file not found at: ${resolvedPath}`);
    }

    // dw-json-loader.tsからセキュアな読み込み関数を使用
    // これにより、すべてのセキュリティバリデーションが一貫して適用されます
    return loadSecureDwJson(dwJsonPath);
  }

  /**
   * dw.json構造をSFCCConfigにマッピング
   *
   * dw.json形式（kebab-caseプロパティ）を内部のSFCCConfig形式
   * （camelCaseプロパティ）に変換します。
   *
   * @param dwConfig - パースされたdw.json設定
   * @returns マッピングされたSFCCConfigオブジェクト
   */
  static mapDwJsonToConfig(dwConfig: DwJsonConfig): SFCCConfig {
    const config: SFCCConfig = {
      hostname: dwConfig.hostname,
      username: dwConfig.username,
      password: dwConfig.password,
    };

    // OAuth認証情報が存在する場合はマッピング
    if (dwConfig['client-id'] && dwConfig['client-secret']) {
      config.clientId = dwConfig['client-id'];
      config.clientSecret = dwConfig['client-secret'];
    }

    // サイトIDが存在する場合はマッピング
    if (dwConfig['site-id']) {
      config.siteId = dwConfig['site-id'];
    }

    // SCAPI認証情報が存在する場合はマッピング
    if (dwConfig['short-code']) {
      config.shortCode = dwConfig['short-code'];
    }

    if (dwConfig['organization-id']) {
      config.organizationId = dwConfig['organization-id'];
    }

    return config;
  }

  /**
   * 異なる動作モードに対する設定のバリデーション
   *
   * このバリデーションはドキュメント専用モード（認証情報不要）と
   * フルモード（APIアクセスに認証情報が必要）の両方をサポートします。
   *
   * @param config - バリデーションする設定
   * @throws サポートされているモードのいずれかで設定が無効な場合はエラー
   */
  private static validate(config: SFCCConfig): void {
    const hasBasicAuth = config.username && config.password;
    const hasOAuth = config.clientId && config.clientSecret;
    const hasHostname = config.hostname && config.hostname.trim() !== '';

    // 認証情報やホスト名が提供されていない場合はローカルモードを許可
    if (!hasBasicAuth && !hasOAuth && !hasHostname) {
      // ローカルモード - クラスドキュメントのみ利用可能
      return;
    }

    // ホスト名が提供されている場合は認証情報を要求
    if (hasHostname && !hasBasicAuth && !hasOAuth) {
      throw new Error(
        'When hostname is provided, either username/password or OAuth credentials (clientId/clientSecret) must be provided',
      );
    }

    // 提供されている場合は追加のホスト名バリデーション
    if (hasHostname) {
      const trimmedHostname = config.hostname!.trim();
      if (!trimmedHostname.match(/^[a-zA-Z0-9.-]+(?::[0-9]+)?$/)) {
        throw new Error('Invalid hostname format in configuration');
      }
    }
  }

  /**
   * 設定が特定の機能をサポートしているかチェック
   *
   * このメソッドは提供された設定を分析し、認証情報とホスト名に基づいて
   * どの機能が利用可能かを判断します。
   *
   * @param config - 分析する設定
   * @returns 利用可能な機能を説明するオブジェクト
   */
  static getCapabilities(config: SFCCConfig): {
    canAccessLogs: boolean;
    canAccessOCAPI: boolean;
    canAccessWebDAV: boolean;
    isLocalMode: boolean;
  } {
    // WebDAV/ログは基本認証またはOAuth認証のいずれかで動作可能
    const hasWebDAVCredentials = !!(config.username && config.password) ||
      !!(config.clientId && config.clientSecret);

    // OCAPIは特にOAuth認証情報を必要とします
    const hasOAuthCredentials = !!(config.clientId && config.clientSecret);

    // ホスト名や認証情報が提供されていない場合はローカルモード
    const hasHostname = !!(config.hostname && config.hostname.trim() !== '');
    const isLocalMode = !hasHostname && !hasWebDAVCredentials;

    return {
      canAccessLogs: hasWebDAVCredentials && hasHostname,
      canAccessOCAPI: hasOAuthCredentials && hasHostname,
      canAccessWebDAV: hasWebDAVCredentials && hasHostname,
      isLocalMode,
    };
  }

  /**
   * ローカル開発モード用の設定を作成
   *
   * SFCC認証情報を必要とせず、ドキュメントとベストプラクティスへの
   * アクセスのみを提供する最小限の設定を作成します。
   *
   * @returns ローカル/ドキュメント専用モードの設定
   */
  static createLocalMode(): SFCCConfig {
    return {
      hostname: '',
      username: undefined,
      password: undefined,
      clientId: undefined,
      clientSecret: undefined,
      siteId: undefined,
      shortCode: undefined,
      organizationId: undefined,
    };
  }
}
