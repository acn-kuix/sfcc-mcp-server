#!/usr/bin/env node

/**
 * SFCC開発MCPサーバーのメインエントリーポイント
 */

import { SFCCDevServer } from './core/server.js';
import { ConfigurationFactory } from './config/configuration-factory.js';
import { Logger } from './utils/logger.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * コマンドライン引数を解析して設定オプションを抽出
 */
function parseCommandLineArgs(): { dwJsonPath?: string; debug?: boolean } {
  const args = process.argv.slice(2);
  const options: { dwJsonPath?: string; debug?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dw-json' && i + 1 < args.length) {
      options.dwJsonPath = args[i + 1];
      i++; // Skip the next argument since we consumed it
    } else if (arg === '--debug' && i + 1 < args.length) {
      const debugValue = args[i + 1].toLowerCase();
      options.debug = debugValue === 'true' || debugValue === '1' || debugValue === 'yes';
      i++; // Skip the next argument since we consumed it
    } else if (arg === '--debug') {
      // 値なしの --debug をデフォルトで true に設定
      options.debug = true;
    }
  }

  return options;
}

/**
 * 一般的な場所でdw.jsonファイルを検索
 */
function findDwJsonFile(): string | undefined {
  const commonPaths = [
    './dw.json',
    '../dw.json',
    '../../dw.json',
    process.env.HOME ? resolve(process.env.HOME, 'dw.json') : null,
  ].filter(Boolean) as string[];

  for (const path of commonPaths) {
    if (existsSync(path)) {
      const logger = Logger.getInstance();
      logger.debug(`Found dw.json at: ${path}`);
      return path;
    }
  }

  return undefined;
}

/**
 * メインアプリケーションエントリーポイント
 */
async function main(): Promise<void> {
  try {
    const options = parseCommandLineArgs();
    const debug = options.debug ?? false;

    // デバッグ設定でグローバルロガーを初期化
    Logger.initialize('SFCC-MCP-Server', true, debug);
    const logger = Logger.getInstance();

    logger.log('Starting SFCC Development MCP Server...');
    if (debug) {
      logger.log('Debug mode enabled');
    }

    // 明示的に指定されていない場合はdw.jsonを検索
    const dwJsonPath = options.dwJsonPath ?? findDwJsonFile();

    // ファクトリーを使用して設定を作成
    const config = ConfigurationFactory.create({
      dwJsonPath,
      // フォールバックとして環境変数をサポート
      hostname: process.env.SFCC_HOSTNAME,
      username: process.env.SFCC_USERNAME,
      password: process.env.SFCC_PASSWORD,
      clientId: process.env.SFCC_CLIENT_ID,
      clientSecret: process.env.SFCC_CLIENT_SECRET,
    });

    // 設定サマリーをログ出力（機密データを除く）
    const capabilities = ConfigurationFactory.getCapabilities(config);

    if (capabilities.isLocalMode) {
      logger.log('Running in Local Mode - SFCC class documentation only');
      logger.log('To access SFCC logs and OCAPI, provide hostname and credentials');
    } else {
      logger.log(`Configuration loaded - Hostname: ${config.hostname}`);
      logger.log(`Available features: Logs=${capabilities.canAccessLogs}, OCAPI=${capabilities.canAccessOCAPI}, WebDAV=${capabilities.canAccessWebDAV}`);
    }

    // サーバーを作成して起動
    const server = new SFCCDevServer(config);
    await server.run();
  } catch (error) {
    const logger = Logger.getInstance();
    logger.error('Failed to start SFCC Development MCP Server:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        logger.log('\nConfiguration Help:');
        logger.log('1. Create a dw.json file with your SFCC credentials');
        logger.log('2. Use --dw-json /path/to/dw.json');
        logger.log('3. Set environment variables: SFCC_HOSTNAME, SFCC_USERNAME, SFCC_PASSWORD');
      }
    }

    process.exit(1);
  }
}

// メイン関数を実行
main().catch((error) => {
  const logger = Logger.getInstance();
  logger.error('Unhandled error:', error);
  process.exit(1);
});
