/**
 * SFCC MCPアプリケーション全体で標準化されたログ出力を行うLoggerクラス。
 * タイムスタンプとログレベル付きの一貫したログ出力を提供します。
 * 一貫したデバッグとstdioへの干渉を避けるため、常にファイルにログを出力します。
 *
 * ## ログディレクトリの場所
 *
 * ロガーはNode.jsの`os.tmpdir()`を通じてオペレーティングシステムの一時ディレクトリを使用します:
 * - **macOS**: `/var/folders/{ユーザー固有のパス}/T/sfcc-mcp-logs/`
 * - **Linux**: `/tmp/sfcc-mcp-logs/`（通常）
 * - **Windows**: `%TEMP%\sfcc-mcp-logs\`（通常 `C:\Users\{ユーザー}\AppData\Local\Temp\`）
 *
 * このアプローチの利点:
 * - ユーザー固有の分離（システム全体の`/tmp`よりセキュア）
 * - OSによる自動クリーンアップ
 * - プラットフォームに適した一時ストレージ
 * - 適切なパーミッション処理
 *
 * ログディレクトリを確認するには、`Logger.getInstance().getLogDirectory()`を使用するか、
 * 初期化中にディレクトリパスを表示するデバッグログを確認してください。
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class Logger {
  private context: string;
  private enableTimestamp: boolean;
  private debugEnabled: boolean;
  private logDir: string;
  private static instance: Logger | null = null;

  /**
   * 新しいLoggerインスタンスを作成
   * @param context このロガーのコンテキスト/コンポーネント名
   * @param enableTimestamp ログメッセージにタイムスタンプを含めるかどうか（デフォルト: true）
   * @param debugEnabled デバッグログを有効にするかどうか（デフォルト: false）
   * @param customLogDir テスト用のカスタムログディレクトリ
   */
  constructor(context: string = 'SFCC-MCP', enableTimestamp: boolean = true, debugEnabled: boolean = false, customLogDir?: string) {
    this.context = context;
    this.enableTimestamp = enableTimestamp;
    this.debugEnabled = debugEnabled;

    // ログディレクトリをセットアップ - テスト用のカスタムディレクトリまたは本番用のデフォルトを使用
    this.logDir = customLogDir ?? join(tmpdir(), 'sfcc-mcp-logs');
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 特定の設定でグローバルロガーインスタンスを初期化
   * アプリケーション起動時に一度だけ呼び出す必要があります
   */
  public static initialize(context: string = 'SFCC-MCP', enableTimestamp: boolean = true, debugEnabled: boolean = false, customLogDir?: string): void {
    Logger.instance = new Logger(context, enableTimestamp, debugEnabled, customLogDir);
  }

  /**
   * グローバルロガーインスタンスを取得
   * 初期化されていない場合はデフォルトインスタンスを作成
   */
  public static getInstance(): Logger {
    Logger.instance ??= new Logger();
    return Logger.instance;
  }

  /**
   * 新しいコンテキストを持ちながらグローバルインスタンスから他の設定を継承する子ロガーを作成
   * @param subContext 現在のコンテキストに追加するサブコンテキスト
   * @returns 結合されたコンテキストを持つ新しいLoggerインスタンス
   */
  public static getChildLogger(subContext: string): Logger {
    const globalLogger = Logger.getInstance();
    return new Logger(`${globalLogger.context}:${subContext}`, globalLogger.enableTimestamp, globalLogger.debugEnabled, globalLogger.logDir);
  }

  /**
   * オプションのタイムスタンプとコンテキストを含めてログメッセージをフォーマット
   * @param message フォーマットするメッセージ
   * @returns フォーマットされたメッセージ文字列
   */
  private formatMessage(message: string): string {
    const timestamp = this.enableTimestamp ? `[${new Date().toISOString()}] ` : '';
    return `${timestamp}[${this.context}] ${message}`;
  }

  /**
   * ログメッセージを適切なログファイルに書き込み
   */
  private writeLog(level: 'info' | 'warn' | 'error' | 'debug', message: string, ...args: any[]): void {
    const formattedMessage = this.formatMessage(message);
    const fullMessage = args.length > 0 ? `${formattedMessage} ${args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
    ).join(' ')}` : formattedMessage;

    // 常にログファイルに書き込み
    const logFile = join(this.logDir, `sfcc-mcp-${level}.log`);
    const logEntry = `${fullMessage}\n`;

    try {
      appendFileSync(logFile, logEntry, 'utf8');
    } catch (error) {
      // フォールバック: ファイルログが失敗した場合、重大なエラーのみstderrを試行
      if (level === 'error') {
        process.stderr.write(`[LOGGER ERROR] Could not write to log file: ${error}\n`);
        process.stderr.write(`${logEntry}`);
      }
    }
  }

  /**
   * 情報メッセージをログ出力
   * @param message ログ出力するメッセージ
   * @param args 含める任意の引数
   */
  public log(message: string, ...args: any[]): void {
    this.writeLog('info', message, ...args);
  }

  /**
   * 情報メッセージをログ出力（logのエイリアス）
   * @param message ログ出力するメッセージ
   * @param args 含める任意の引数
   */
  public info(message: string, ...args: any[]): void {
    this.writeLog('info', message, ...args);
  }

  /**
   * 警告メッセージをログ出力
   * @param message ログ出力する警告メッセージ
   * @param args 含める任意の引数
   */
  public warn(message: string, ...args: any[]): void {
    this.writeLog('warn', message, ...args);
  }

  /**
   * エラーメッセージをログ出力
   * @param message ログ出力するエラーメッセージ
   * @param args 含める任意の引数
   */
  public error(message: string, ...args: any[]): void {
    this.writeLog('error', message, ...args);
  }

  /**
   * デバッグメッセージをログ出力（デバッグが有効な場合のみ）
   * @param message ログ出力するデバッグメッセージ
   * @param args 含める任意の引数
   */
  public debug(message: string, ...args: any[]): void {
    if (this.debugEnabled) {
      this.writeLog('debug', `[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * パラメータ付きでメソッド開始をログ出力
   * @param methodName 開始されるメソッドの名前
   * @param params メソッドに渡される任意のパラメータ
   */
  public methodEntry(methodName: string, params?: any): void {
    if (this.debugEnabled) {
      const paramStr = params ? ` with params: ${JSON.stringify(params)}` : '';
      this.debug(`Entering method: ${methodName}${paramStr}`);
    }
  }

  /**
   * 結果付きでメソッド終了をログ出力（オプション）
   * @param methodName 終了されるメソッドの名前
   * @param params メソッドから返される任意の結果
   */
  public methodExit(methodName: string, result?: any): void {
    if (this.debugEnabled) {
      const resultStr = result !== undefined ? ` with result: ${typeof result === 'object' ? JSON.stringify(result) : result}` : '';
      this.debug(`Exiting method: ${methodName}${resultStr}`);
    }
  }

  /**
   * パフォーマンス計測情報をログ出力
   * @param operation 計測対象の操作
   * @param startTime 開始時刻（performance.now()またはDate.now()から）
   */
  public timing(operation: string, startTime: number): void {
    if (this.debugEnabled) {
      const duration = Date.now() - startTime;
      this.debug(`Performance: ${operation} took ${duration}ms`);
    }
  }

  /**
   * 新しいコンテキストを持ちながら他の設定を継承する子ロガーを作成
   * @param subContext 現在のコンテキストに追加するサブコンテキスト
   * @returns 結合されたコンテキストを持つ新しいLoggerインスタンス
   */
  public createChildLogger(subContext: string): Logger {
    return new Logger(`${this.context}:${subContext}`, this.enableTimestamp, this.debugEnabled, this.logDir);
  }

  /**
   * デバッグログの有効/無効を設定
   * @param enabled デバッグログを有効にするかどうか
   */
  public setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  /**
   * 現在のログディレクトリを取得
   */
  public getLogDirectory(): string {
    return this.logDir;
  }
}

// 便利のためシングルトンインスタンスゲッターをエクスポート
export const getLogger = Logger.getInstance;
