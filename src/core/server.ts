/**
 * SFCC開発用MCPサーバー
 *
 * このモジュールはSalesforce B2C Commerce Cloud開発機能にアクセスするための
 * Model Context Protocol (MCP) サーバーを実装します。AIアシスタントがSFCC開発ツール
 * およびデータと対話するための標準化されたインターフェースを提供します。
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SFCCConfig } from '../types/types.js';
import { Logger } from '../utils/logger.js';
import { ConfigurationFactory } from '../config/configuration-factory.js';
import {
  SFCC_DOCUMENTATION_TOOLS,
  BEST_PRACTICES_TOOLS,
  SFRA_DOCUMENTATION_TOOLS,
  LOG_TOOLS,
  JOB_LOG_TOOLS,
  SYSTEM_OBJECT_TOOLS,
  CODE_VERSION_TOOLS,
  DATA_API_TOOLS,
} from './tool-definitions.js';

// モジュラーツールハンドラー
import { BaseToolHandler, HandlerContext } from './handlers/base-handler.js';
import { LogToolHandler } from './handlers/log-handler.js';
import { JobLogToolHandler } from './handlers/job-log-handler.js';
import { DocsToolHandler } from './handlers/docs-handler.js';
import { BestPracticesToolHandler } from './handlers/best-practices-handler.js';
import { SFRAToolHandler } from './handlers/sfra-handler.js';
import { SystemObjectToolHandler } from './handlers/system-object-handler.js';
import { CodeVersionToolHandler } from './handlers/code-version-handler.js';
import { DataAPIToolHandler } from './handlers/data-api-handler.js';
/**
 * SFCC開発支援用MCPサーバー実装
 *
 * このクラスはMCPサーバーをセットアップし、利用可能なツールを定義し、
 * MCPクライアント（AIアシスタントなど）からのリクエストを処理して
 * SFCC開発機能と対話します。
 */
export class SFCCDevServer {
  private server!: Server;
  private logger: Logger;
  private config: SFCCConfig;
  private capabilities: ReturnType<typeof ConfigurationFactory.getCapabilities>;
  private handlers: BaseToolHandler[] = [];

  /**
   * SFCC開発MCPサーバーを初期化
   *
   * @param config - ログシステムに接続するためのSFCC設定
   */
  constructor(config: SFCCConfig) {
    this.logger = Logger.getChildLogger('Server');
    this.config = config;
    this.logMethodEntry('constructor', { hostname: config.hostname });
    this.capabilities = ConfigurationFactory.getCapabilities(config);
    this.initializeServer();
    this.registerHandlers();
    this.setupToolHandlers();

    this.logMethodExit('constructor');
  }

  private initializeServer(): void {
    this.server = new Server(
      {
        name: 'SFCC Development MCP Server',
        version: '1.1.0', // synced with package.json
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
  }

  private logMethodEntry(methodName: string, params?: any): void {
    this.logger.methodEntry(methodName, params);
  }

  private logMethodExit(methodName: string, result?: any): void {
    this.logger.methodExit(methodName, result);
  }

  // モジュラーハンドラーを登録（各ハンドラーは独自の責任をカプセル化）
  private registerHandlers(): void {
    const context: HandlerContext = {
      logger: this.logger,
      config: this.config,
      capabilities: this.capabilities,
    };
    this.handlers = [
      new LogToolHandler(context, 'Log'),
      new JobLogToolHandler(context, 'JobLog'),
      new DocsToolHandler(context, 'Docs'),
      new BestPracticesToolHandler(context, 'BestPractices'),
      new SFRAToolHandler(context, 'SFRA'),
      new SystemObjectToolHandler(context, 'SystemObjects'),
      new CodeVersionToolHandler(context, 'CodeVersions'),
      new DataAPIToolHandler(context, 'DataAPI'),
    ];
  }

  /**
   * SFCC操作用のMCPツールハンドラーをセットアップ
   */
  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [];

      // 常に利用可能なツール
      tools.push(...SFCC_DOCUMENTATION_TOOLS);
      tools.push(...BEST_PRACTICES_TOOLS);
      tools.push(...SFRA_DOCUMENTATION_TOOLS);

      // 利用可能な機能に基づく条件付きツール
      if (this.capabilities.canAccessLogs) {
        tools.push(...LOG_TOOLS);
        tools.push(...JOB_LOG_TOOLS);
      }

      if (this.capabilities.canAccessOCAPI) {
        tools.push(...SYSTEM_OBJECT_TOOLS);
        tools.push(...CODE_VERSION_TOOLS);
        tools.push(...DATA_API_TOOLS);
      }

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<any> => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();

      this.logger.methodEntry(`handleToolRequest:${name}`, args);

      try {
        const handler = this.handlers.find((h) => h.canHandle(name));
        if (!handler) {
          this.logger.error(`Unknown tool requested: ${name}`);
          throw new Error(`Unknown tool: ${name}`);
        }
        const result = await handler.handle(name, args ?? {}, startTime);

        // デバッグモードで完全なレスポンスをログ出力
        this.logger.debug(`Full response for ${name}:`, {
          contentType: result.content?.[0]?.type,
          contentLength: result.content?.[0]?.text?.length ?? 0,
          responsePreview: result.content?.[0]?.text?.substring(0, 200) + (result.content?.[0]?.text?.length > 200 ? '...' : ''),
          fullResponse: result.content?.[0]?.text,
        });

        return result as any;
      } catch (error) {
        this.logger.error(`Error handling tool "${name}":`, error);
        this.logger.timing(`${name}_error`, startTime);
        const errorResult = {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };

        // デバッグモードでエラーレスポンスをログ出力
        this.logger.debug(`Error response for ${name}:`, errorResult);

        return errorResult as any;
      } finally {
        this.logger.methodExit(`handleToolRequest:${name}`);
      }
    });
  }

  /**
   * MCPサーバーを起動
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();

    // グレースフルシャットダウンをセットアップ
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());

    await this.server.connect(transport);
    this.logger.log('SFCC Development MCP server running on stdio');
  }

  /**
   * サーバーをグレースフルにシャットダウンしリソースを解放
   */
  private async shutdown(): Promise<void> {
    this.logger.log('Shutting down SFCC Development MCP server...');

    // すべてのハンドラーを解放
    await Promise.all(this.handlers.map(handler => handler.dispose()));

    this.logger.log('SFCC Development MCP server shutdown complete');
    process.exit(0);
  }
}
