/**
 * Data API Client for OCAPI and SCAPI
 *
 * This module provides a unified client for making requests to SFCC Data APIs.
 * It supports both OCAPI (Open Commerce API) and SCAPI (Shopper Commerce API).
 */

import { OCAPIConfig, Endpoint, DataAPIRequestParams, DataAPIResponse } from '../types/types.js';
import { OCAPIAuthClient } from './base/ocapi-auth-client.js';
import { buildOCAPIBaseUrl } from '../utils/ocapi-url-builder.js';
import { EndpointLoader } from '../utils/endpoint-loader.js';
import { Logger } from '../utils/logger.js';

/**
 * Data API Client
 * Unified client for OCAPI and SCAPI requests
 */
export class DataAPIClient extends OCAPIAuthClient {
  private endpointLoader: EndpointLoader;
  private clientLogger: Logger;
  private siteId?: string;

  constructor(config: OCAPIConfig) {
    super(config);
    this.baseUrl = buildOCAPIBaseUrl(config);
    this.siteId = config.siteId;
    this.endpointLoader = EndpointLoader.getInstance();
    this.clientLogger = Logger.getChildLogger('DataAPIClient');
  }

  /**
   * Execute an API request based on endpoint configuration
   */
  async executeEndpoint(
    toolName: string,
    params: DataAPIRequestParams = {},
  ): Promise<DataAPIResponse> {
    const endpoint = this.endpointLoader.getEndpoint(toolName);

    if (!endpoint) {
      return {
        data: null,
        status: 400,
        success: false,
        error: `Unknown endpoint: ${toolName}`,
      };
    }

    try {
      const url = this.buildUrl(endpoint, params);
      this.clientLogger.debug(`Executing ${endpoint.method} request to: ${url}`);

      let result: any;

      switch (endpoint.method) {
        case 'GET':
          result = await this.get(url);
          break;
        case 'POST':
          result = await this.post(url, this.buildRequestBody(endpoint, params));
          break;
        case 'PUT':
          result = await this.put(url, this.buildRequestBody(endpoint, params));
          break;
        case 'PATCH':
          result = await this.patch(url, this.buildRequestBody(endpoint, params));
          break;
        case 'DELETE':
          result = await this.delete(url);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${endpoint.method}`);
      }

      return {
        data: result,
        status: 200,
        success: true,
      };
    } catch (error) {
      this.clientLogger.error(`Error executing endpoint ${toolName}: ${error}`);
      return {
        data: null,
        status: 500,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build the full URL for an endpoint request
   */
  private buildUrl(endpoint: Endpoint, params: DataAPIRequestParams): string {
    let path = endpoint.path;

    // Replace path parameters
    if (params.pathParams) {
      for (const [key, value] of Object.entries(params.pathParams)) {
        path = path.replace(`{${key}}`, encodeURIComponent(value));
      }
    }

    // Build query string from non-path parameters
    const queryParams: Record<string, string> = {};

    // Add query parameters
    if (params.queryParams) {
      for (const [key, value] of Object.entries(params.queryParams)) {
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = String(value);
        }
      }
    }

    // Build query string
    const queryString = Object.entries(queryParams)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return queryString ? `${path}?${queryString}` : path;
  }

  /**
   * Build the request body for POST/PUT/PATCH requests
   */
  private buildRequestBody(
    endpoint: Endpoint,
    params: DataAPIRequestParams,
  ): Record<string, any> {
    // Start with default body if defined
    const body = endpoint.defaultBody ? { ...endpoint.defaultBody } : {};

    // Merge with provided body
    if (params.body) {
      Object.assign(body, params.body);
    }

    return body;
  }

  /**
   * Get the site ID being used by this client
   */
  getSiteId(): string | undefined {
    return this.siteId;
  }

  /**
   * Set the site ID for site-specific requests
   */
  setSiteId(siteId: string): void {
    this.siteId = siteId;
  }

  /**
   * Get available endpoints
   */
  getAvailableEndpoints(): Endpoint[] {
    return this.endpointLoader.getEndpoints();
  }

  /**
   * Check if an endpoint is available
   */
  hasEndpoint(toolName: string): boolean {
    return this.endpointLoader.hasEndpoint(toolName);
  }

  // Convenience methods for common operations

  /**
   * Search for products
   */
  async searchProducts(
    siteId: string,
    query?: string,
    count: number = 25,
    start: number = 0,
    expand?: string,
  ): Promise<DataAPIResponse> {
    const body: Record<string, any> = {
      query: query
        ? { text_query: { fields: ['id', 'name'], search_phrase: query } }
        : { match_all_query: {} },
      count,
      start,
    };

    if (expand) {
      body.expand = expand.split(',');
    }

    return this.executeEndpoint('search_products', {
      pathParams: { site_id: siteId },
      body,
    });
  }

  /**
   * Get a specific product
   */
  async getProduct(
    siteId: string,
    productId: string,
    expand?: string,
  ): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_product', {
      pathParams: { site_id: siteId, product_id: productId },
      queryParams: expand ? { expand } : undefined,
    });
  }

  /**
   * Get all catalogs
   */
  async getCatalogs(count: number = 25, start: number = 0): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_catalogs', {
      queryParams: { count, start },
    });
  }

  /**
   * Get a specific catalog
   */
  async getCatalog(catalogId: string): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_catalog', {
      pathParams: { catalog_id: catalogId },
    });
  }

  /**
   * Get categories from a catalog
   */
  async getCategories(
    catalogId: string,
    levels: number = 1,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_categories', {
      pathParams: { catalog_id: catalogId },
      queryParams: { levels, count, start },
    });
  }

  /**
   * Get all sites
   */
  async getSites(count: number = 25, start: number = 0): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_sites', {
      queryParams: { count, start },
    });
  }

  /**
   * Get a specific site
   */
  async getSite(siteId: string): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_site', {
      pathParams: { site_id: siteId },
    });
  }

  /**
   * Search for customers
   */
  async searchCustomers(
    siteId: string,
    query?: string,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    const body: Record<string, any> = {
      query: query
        ? { text_query: { fields: ['email', 'first_name', 'last_name'], search_phrase: query } }
        : { match_all_query: {} },
      count,
      start,
    };

    return this.executeEndpoint('search_customers', {
      pathParams: { site_id: siteId },
      body,
    });
  }

  /**
   * Search for orders
   */
  async searchOrders(
    siteId: string,
    query?: string,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    const body: Record<string, any> = {
      query: query
        ? { text_query: { fields: ['order_no', 'customer_email'], search_phrase: query } }
        : { match_all_query: {} },
      count,
      start,
    };

    return this.executeEndpoint('search_orders', {
      pathParams: { site_id: siteId },
      body,
    });
  }

  /**
   * Get a specific order
   */
  async getOrder(siteId: string, orderNo: string, expand?: string): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_order', {
      pathParams: { site_id: siteId, order_no: orderNo },
      queryParams: expand ? { expand } : undefined,
    });
  }

  /**
   * Search for custom objects
   */
  async searchCustomObjects(
    objectType: string,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    return this.executeEndpoint('search_custom_objects', {
      pathParams: { object_type: objectType },
      body: {
        query: { match_all_query: {} },
        count,
        start,
      },
    });
  }

  /**
   * Get a specific custom object
   */
  async getCustomObject(objectType: string, key: string): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_custom_object', {
      pathParams: { object_type: objectType, key },
    });
  }

  /**
   * Get inventory lists
   */
  async getInventoryLists(count: number = 25, start: number = 0): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_inventory_lists', {
      queryParams: { count, start },
    });
  }

  /**
   * Get product inventory
   */
  async getProductInventory(
    inventoryListId: string,
    productId: string,
  ): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_product_inventory', {
      pathParams: { inventory_list_id: inventoryListId, product_id: productId },
    });
  }

  /**
   * Get price books
   */
  async getPriceBooks(count: number = 25, start: number = 0): Promise<DataAPIResponse> {
    return this.executeEndpoint('get_price_books', {
      queryParams: { count, start },
    });
  }

  /**
   * Search for campaigns
   */
  async searchCampaigns(
    siteId: string,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    return this.executeEndpoint('search_campaigns', {
      pathParams: { site_id: siteId },
      body: {
        query: { match_all_query: {} },
        count,
        start,
      },
    });
  }

  /**
   * Search for promotions
   */
  async searchPromotions(
    siteId: string,
    campaignId?: string,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    const body: Record<string, any> = {
      query: campaignId
        ? { term_query: { fields: ['campaign_id'], operator: 'is', values: [campaignId] } }
        : { match_all_query: {} },
      count,
      start,
    };

    return this.executeEndpoint('search_promotions', {
      pathParams: { site_id: siteId },
      body,
    });
  }

  /**
   * Search for coupons
   */
  async searchCoupons(
    siteId: string,
    count: number = 25,
    start: number = 0,
  ): Promise<DataAPIResponse> {
    return this.executeEndpoint('search_coupons', {
      pathParams: { site_id: siteId },
      body: {
        query: { match_all_query: {} },
        count,
        start,
      },
    });
  }
}
