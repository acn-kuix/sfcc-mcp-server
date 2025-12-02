/**
 * Endpoint Loader Utility
 *
 * This module provides functionality to load and manage API endpoint definitions
 * from the endpoints.json configuration file.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Endpoint } from '../types/types.js';
import { Logger } from './logger.js';

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Singleton class for loading and managing API endpoints
 */
export class EndpointLoader {
  private static instance: EndpointLoader;
  private endpoints: Endpoint[] = [];
  private endpointMap: Map<string, Endpoint> = new Map();
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getChildLogger('EndpointLoader');
    this.loadEndpoints();
  }

  /**
   * Get the singleton instance of EndpointLoader
   */
  static getInstance(): EndpointLoader {
    if (!EndpointLoader.instance) {
      EndpointLoader.instance = new EndpointLoader();
    }
    return EndpointLoader.instance;
  }

  /**
   * Load endpoints from the JSON configuration file
   */
  private loadEndpoints(): void {
    try {
      const configPath = join(__dirname, '..', 'config', 'endpoints.json');
      this.logger.debug(`Loading endpoints from: ${configPath}`);

      const configContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      if (config.endpoints && Array.isArray(config.endpoints)) {
        this.endpoints = config.endpoints;

        // Build a map for quick lookup by tool name
        for (const endpoint of this.endpoints) {
          this.endpointMap.set(endpoint.toolName, endpoint);
        }

        this.logger.debug(`Loaded ${this.endpoints.length} endpoints`);
      } else {
        this.logger.warn('No endpoints found in configuration');
        this.endpoints = [];
      }
    } catch (error) {
      this.logger.error(`Failed to load endpoints: ${error}`);
      this.endpoints = this.getDefaultEndpoints();
    }
  }

  /**
   * Get default endpoints if the configuration file cannot be loaded
   */
  private getDefaultEndpoints(): Endpoint[] {
    return [
      {
        toolName: 'get_catalogs',
        path: '/catalogs',
        description: 'Get a list of available catalogs',
        method: 'GET',
        parameters: [],
        apiType: 'ocapi',
        requiresSiteId: false,
      },
    ];
  }

  /**
   * Get all loaded endpoints
   */
  getEndpoints(): Endpoint[] {
    return [...this.endpoints];
  }

  /**
   * Get an endpoint by its tool name
   */
  getEndpoint(toolName: string): Endpoint | undefined {
    return this.endpointMap.get(toolName);
  }

  /**
   * Get all OCAPI endpoints
   */
  getOCAPIEndpoints(): Endpoint[] {
    return this.endpoints.filter((e) => e.apiType === 'ocapi');
  }

  /**
   * Get all SCAPI endpoints
   */
  getSCAPIEndpoints(): Endpoint[] {
    return this.endpoints.filter((e) => e.apiType === 'scapi');
  }

  /**
   * Get endpoint tool names
   */
  getToolNames(): string[] {
    return this.endpoints.map((e) => e.toolName);
  }

  /**
   * Get tool name set for O(1) lookup
   */
  getToolNameSet(): Set<string> {
    return new Set(this.getToolNames());
  }

  /**
   * Check if an endpoint exists
   */
  hasEndpoint(toolName: string): boolean {
    return this.endpointMap.has(toolName);
  }

  /**
   * Reload endpoints from configuration
   */
  reload(): void {
    this.endpoints = [];
    this.endpointMap.clear();
    this.loadEndpoints();
  }
}
