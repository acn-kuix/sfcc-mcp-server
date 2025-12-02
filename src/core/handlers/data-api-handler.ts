/**
 * Data API Tool Handler
 *
 * This module handles all Data API (OCAPI/SCAPI) related tool requests.
 * It provides access to products, catalogs, customers, orders, and other
 * SFCC data through the OCAPI endpoints.
 */

import {
  BaseToolHandler,
  HandlerContext,
  GenericToolSpec,
  ToolExecutionContext,
  ToolArguments,
} from './base-handler.js';
import { DataAPIClient } from '../../clients/data-api-client.js';
import { OCAPIConfig, DataAPIRequestParams } from '../../types/types.js';
import { EndpointLoader } from '../../utils/endpoint-loader.js';

// Tool name type for Data API tools
type DataAPIToolName =
  | 'search_products'
  | 'get_product'
  | 'get_catalogs'
  | 'get_catalog'
  | 'get_categories'
  | 'get_category'
  | 'get_sites'
  | 'get_site'
  | 'search_campaigns'
  | 'get_campaign'
  | 'search_promotions'
  | 'search_coupons'
  | 'get_inventory_lists'
  | 'get_inventory_list'
  | 'get_product_inventory'
  | 'search_customers'
  | 'get_customer'
  | 'get_customer_groups'
  | 'search_custom_objects'
  | 'get_custom_object'
  | 'search_orders'
  | 'get_order'
  | 'get_locales'
  | 'get_currencies'
  | 'get_price_books'
  | 'get_price_book'
  | 'get_content_assets'
  | 'get_content_asset';

/**
 * Execution context for Data API tools
 */
interface DataAPIExecutionContext extends ToolExecutionContext {
  dataAPIClient: DataAPIClient;
}

/**
 * Data API Tool Handler
 */
export class DataAPIToolHandler extends BaseToolHandler<DataAPIToolName> {
  private dataAPIClient: DataAPIClient | null = null;
  private toolNameSet: Set<string>;
  private endpointLoader: EndpointLoader;

  constructor(context: HandlerContext, subLoggerName: string) {
    super(context, subLoggerName);
    this.endpointLoader = EndpointLoader.getInstance();
    this.toolNameSet = this.endpointLoader.getToolNameSet();
  }

  /**
   * Get tool name set for O(1) lookup
   */
  protected getToolNameSet(): Set<string> {
    return this.toolNameSet;
  }

  /**
   * Create execution context with Data API client
   */
  protected async createExecutionContext(): Promise<DataAPIExecutionContext> {
    await this.initialize();
    return {
      handlerContext: this.context,
      logger: this.logger,
      dataAPIClient: this.dataAPIClient!,
    };
  }

  /**
   * Initialize the Data API client
   */
  protected async onInitialize(): Promise<void> {
    if (!this.context.capabilities.canAccessOCAPI) {
      this.logger.warn('OCAPI access not available - Data API handler will not be functional');
      return;
    }

    const config: OCAPIConfig = {
      hostname: this.context.config.hostname!,
      clientId: this.context.config.clientId!,
      clientSecret: this.context.config.clientSecret!,
      siteId: this.context.config.siteId,
    };

    this.dataAPIClient = new DataAPIClient(config);
    this.logger.debug('Data API client initialized');
  }

  /**
   * Get tool configuration
   */
  protected getToolConfig(): Record<DataAPIToolName, GenericToolSpec> {
    return {
      // Product Tools
      search_products: {
        exec: async (args, ctx) => this.executeEndpoint('search_products', args, ctx),
        logMessage: (args) => `Searching products in site: ${args.site_id}`,
      },
      get_product: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id', 'product_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_product', args, ctx),
        logMessage: (args) => `Getting product: ${args.product_id} in site: ${args.site_id}`,
      },

      // Catalog Tools
      get_catalogs: {
        exec: async (args, ctx) => this.executeEndpoint('get_catalogs', args, ctx),
        logMessage: () => 'Getting all catalogs',
      },
      get_catalog: {
        validate: (args, toolName) => this.validateArgs(args, ['catalog_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_catalog', args, ctx),
        logMessage: (args) => `Getting catalog: ${args.catalog_id}`,
      },
      get_categories: {
        validate: (args, toolName) => this.validateArgs(args, ['catalog_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_categories', args, ctx),
        logMessage: (args) => `Getting categories for catalog: ${args.catalog_id}`,
      },
      get_category: {
        validate: (args, toolName) => this.validateArgs(args, ['catalog_id', 'category_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_category', args, ctx),
        logMessage: (args) => `Getting category: ${args.category_id} in catalog: ${args.catalog_id}`,
      },

      // Site Tools
      get_sites: {
        exec: async (args, ctx) => this.executeEndpoint('get_sites', args, ctx),
        logMessage: () => 'Getting all sites',
      },
      get_site: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_site', args, ctx),
        logMessage: (args) => `Getting site: ${args.site_id}`,
      },

      // Campaign and Promotion Tools
      search_campaigns: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('search_campaigns', args, ctx),
        logMessage: (args) => `Searching campaigns in site: ${args.site_id}`,
      },
      get_campaign: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id', 'campaign_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_campaign', args, ctx),
        logMessage: (args) => `Getting campaign: ${args.campaign_id} in site: ${args.site_id}`,
      },
      search_promotions: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('search_promotions', args, ctx),
        logMessage: (args) => `Searching promotions in site: ${args.site_id}`,
      },
      search_coupons: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('search_coupons', args, ctx),
        logMessage: (args) => `Searching coupons in site: ${args.site_id}`,
      },

      // Inventory Tools
      get_inventory_lists: {
        exec: async (args, ctx) => this.executeEndpoint('get_inventory_lists', args, ctx),
        logMessage: () => 'Getting all inventory lists',
      },
      get_inventory_list: {
        validate: (args, toolName) => this.validateArgs(args, ['inventory_list_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_inventory_list', args, ctx),
        logMessage: (args) => `Getting inventory list: ${args.inventory_list_id}`,
      },
      get_product_inventory: {
        validate: (args, toolName) => this.validateArgs(args, ['inventory_list_id', 'product_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_product_inventory', args, ctx),
        logMessage: (args) => `Getting product inventory: ${args.product_id} in list: ${args.inventory_list_id}`,
      },

      // Customer Tools
      search_customers: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('search_customers', args, ctx),
        logMessage: (args) => `Searching customers in site: ${args.site_id}`,
      },
      get_customer: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id', 'customer_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_customer', args, ctx),
        logMessage: (args) => `Getting customer: ${args.customer_id} in site: ${args.site_id}`,
      },
      get_customer_groups: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_customer_groups', args, ctx),
        logMessage: (args) => `Getting customer groups in site: ${args.site_id}`,
      },

      // Custom Object Tools
      search_custom_objects: {
        validate: (args, toolName) => this.validateArgs(args, ['object_type'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('search_custom_objects', args, ctx),
        logMessage: (args) => `Searching custom objects of type: ${args.object_type}`,
      },
      get_custom_object: {
        validate: (args, toolName) => this.validateArgs(args, ['object_type', 'key'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_custom_object', args, ctx),
        logMessage: (args) => `Getting custom object: ${args.key} of type: ${args.object_type}`,
      },

      // Order Tools
      search_orders: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('search_orders', args, ctx),
        logMessage: (args) => `Searching orders in site: ${args.site_id}`,
      },
      get_order: {
        validate: (args, toolName) => this.validateArgs(args, ['site_id', 'order_no'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_order', args, ctx),
        logMessage: (args) => `Getting order: ${args.order_no} in site: ${args.site_id}`,
      },

      // Price and Locale Tools
      get_locales: {
        exec: async (args, ctx) => this.executeEndpoint('get_locales', args, ctx),
        logMessage: () => 'Getting all locales',
      },
      get_currencies: {
        exec: async (args, ctx) => this.executeEndpoint('get_currencies', args, ctx),
        logMessage: () => 'Getting all currencies',
      },
      get_price_books: {
        exec: async (args, ctx) => this.executeEndpoint('get_price_books', args, ctx),
        logMessage: () => 'Getting all price books',
      },
      get_price_book: {
        validate: (args, toolName) => this.validateArgs(args, ['price_book_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_price_book', args, ctx),
        logMessage: (args) => `Getting price book: ${args.price_book_id}`,
      },

      // Content Tools
      get_content_assets: {
        validate: (args, toolName) => this.validateArgs(args, ['library_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_content_assets', args, ctx),
        logMessage: (args) => `Getting content assets from library: ${args.library_id}`,
      },
      get_content_asset: {
        validate: (args, toolName) => this.validateArgs(args, ['library_id', 'content_id'], toolName),
        exec: async (args, ctx) => this.executeEndpoint('get_content_asset', args, ctx),
        logMessage: (args) => `Getting content asset: ${args.content_id} from library: ${args.library_id}`,
      },
    };
  }

  /**
   * Execute an endpoint using the Data API client
   */
  private async executeEndpoint(
    toolName: string,
    args: ToolArguments,
    ctx: ToolExecutionContext,
  ): Promise<any> {
    const dataCtx = ctx as DataAPIExecutionContext;

    if (!dataCtx.dataAPIClient) {
      throw new Error('Data API client not initialized. Check OCAPI credentials.');
    }

    // Build request parameters from args
    const params = this.buildRequestParams(toolName, args);

    // Execute the endpoint
    const response = await dataCtx.dataAPIClient.executeEndpoint(toolName, params);

    if (!response.success) {
      throw new Error(response.error ?? 'Unknown error occurred');
    }

    return response.data;
  }

  /**
   * Build request parameters from tool arguments
   */
  private buildRequestParams(toolName: string, args: ToolArguments): DataAPIRequestParams {
    const endpoint = this.endpointLoader.getEndpoint(toolName);

    if (!endpoint) {
      return { pathParams: {}, queryParams: {}, body: undefined };
    }

    const pathParams: Record<string, string> = {};
    const queryParams: Record<string, string | number | boolean> = {};
    let body: Record<string, any> | undefined;

    // Separate path params from query params based on endpoint definition
    for (const param of endpoint.parameters) {
      const value = args[param.name];

      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Check if this is a path parameter (appears in the path)
      if (endpoint.path.includes(`{${param.name}}`)) {
        pathParams[param.name] = String(value);
      } else if (param.name !== 'query') {
        // Query parameters (except 'query' which goes in body)
        queryParams[param.name] = value;
      }
    }

    // Handle search requests with query parameter
    if (endpoint.method === 'POST' && endpoint.defaultBody) {
      body = { ...endpoint.defaultBody };

      // Handle text query if provided
      if (args.query) {
        body.query = {
          text_query: {
            fields: this.getSearchFieldsForTool(toolName),
            search_phrase: args.query,
          },
        };
      }

      // Apply count and start to body
      if (args.count !== undefined) {
        body.count = args.count;
      }
      if (args.start !== undefined) {
        body.start = args.start;
      }

      // Apply expand if specified
      if (args.expand) {
        body.expand = args.expand.split(',').map((s: string) => s.trim());
      }

      // Apply campaign_id filter for promotions
      if (toolName === 'search_promotions' && args.campaign_id) {
        body.query = {
          term_query: {
            fields: ['campaign_id'],
            operator: 'is',
            values: [args.campaign_id],
          },
        };
      }
    }

    return { pathParams, queryParams, body };
  }

  /**
   * Get search fields for a specific tool
   */
  private getSearchFieldsForTool(toolName: string): string[] {
    const fieldMap: Record<string, string[]> = {
      search_products: ['id', 'name'],
      search_customers: ['email', 'first_name', 'last_name'],
      search_orders: ['order_no', 'customer_email'],
    };

    return fieldMap[toolName] || ['id', 'name'];
  }

  /**
   * Clean up resources
   */
  protected async onDispose(): Promise<void> {
    this.dataAPIClient = null;
    this.logger.debug('Data API handler disposed');
  }
}
