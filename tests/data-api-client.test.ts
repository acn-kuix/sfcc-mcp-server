/**
 * Tests for DataAPIClient
 * Tests OCAPI/SCAPI unified client functionality
 */

import { DataAPIClient } from '../src/clients/data-api-client.js';
import { OCAPIConfig, Endpoint } from '../src/types/types.js';
import { EndpointLoader } from '../src/utils/endpoint-loader.js';

// Mock fetch globally
global.fetch = jest.fn();

// Mock TokenManager
jest.mock('../src/clients/base/oauth-token.js', () => ({
  TokenManager: {
    getInstance: jest.fn(() => ({
      getValidToken: jest.fn().mockReturnValue('mock-token'),
      storeToken: jest.fn(),
      clearToken: jest.fn(),
      getTokenExpiration: jest.fn(),
      isTokenValid: jest.fn().mockReturnValue(true),
      clearAllTokens: jest.fn(),
    })),
  },
}));

// Mock Logger
jest.mock('../src/utils/logger.js', () => ({
  Logger: {
    initialize: jest.fn(),
    getInstance: jest.fn(() => ({
      methodEntry: jest.fn(),
      methodExit: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      timing: jest.fn(),
      log: jest.fn(),
      info: jest.fn(),
    })),
    getChildLogger: jest.fn(() => ({
      methodEntry: jest.fn(),
      methodExit: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      timing: jest.fn(),
      log: jest.fn(),
      info: jest.fn(),
    })),
  },
}));

// Mock BaseHttpClient
jest.mock('../src/clients/base/http-client.js');

// Mock EndpointLoader
const mockEndpointLoader = {
  getEndpoint: jest.fn(),
  getEndpoints: jest.fn(),
  hasEndpoint: jest.fn(),
  getToolNameSet: jest.fn(),
};

jest.mock('../src/utils/endpoint-loader.js', () => ({
  EndpointLoader: {
    getInstance: jest.fn(() => mockEndpointLoader),
  },
}));

describe('DataAPIClient', () => {
  let client: DataAPIClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockConfig: OCAPIConfig = {
    hostname: 'test-instance.demandware.net',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    siteId: 'test-site',
    version: 'v21_3',
  };

  const mockGetEndpoint: Endpoint = {
    toolName: 'get_catalogs',
    path: '/catalogs',
    description: 'Get catalogs',
    method: 'GET',
    parameters: [
      { name: 'count', description: 'Count', type: 'number', required: false },
      { name: 'start', description: 'Start', type: 'number', required: false },
    ],
    apiType: 'ocapi',
    requiresSiteId: false,
  };

  const mockPostEndpoint: Endpoint = {
    toolName: 'search_products',
    path: '/product_search',
    description: 'Search products',
    method: 'POST',
    parameters: [
      { name: 'site_id', description: 'Site ID', type: 'string', required: true },
      { name: 'query', description: 'Query', type: 'string', required: false },
      { name: 'count', description: 'Count', type: 'number', required: false },
    ],
    defaultBody: { query: { match_all_query: {} }, count: 25, start: 0 },
    apiType: 'ocapi',
    requiresSiteId: true,
  };

  const mockPathParamEndpoint: Endpoint = {
    toolName: 'get_product',
    path: '/products/{product_id}',
    description: 'Get product',
    method: 'GET',
    parameters: [
      { name: 'product_id', description: 'Product ID', type: 'string', required: true },
      { name: 'expand', description: 'Expand', type: 'string', required: false },
    ],
    apiType: 'ocapi',
    requiresSiteId: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
      text: async () => JSON.stringify({ data: 'test' }),
    } as Response);

    // Setup endpoint loader mocks
    mockEndpointLoader.getEndpoint.mockImplementation((name: string) => {
      const endpoints: Record<string, Endpoint> = {
        get_catalogs: mockGetEndpoint,
        search_products: mockPostEndpoint,
        get_product: mockPathParamEndpoint,
      };
      return endpoints[name];
    });
    mockEndpointLoader.getEndpoints.mockReturnValue([mockGetEndpoint, mockPostEndpoint, mockPathParamEndpoint]);
    mockEndpointLoader.hasEndpoint.mockImplementation((name: string) => {
      return ['get_catalogs', 'search_products', 'get_product'].includes(name);
    });

    client = new DataAPIClient(mockConfig);

    // Manually set up logger mock
    (client as any).clientLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(client).toBeInstanceOf(DataAPIClient);
    });

    it('should initialize endpoint loader', () => {
      expect(EndpointLoader.getInstance).toHaveBeenCalled();
    });

    it('should set siteId from config', () => {
      expect(client.getSiteId()).toBe('test-site');
    });
  });

  describe('executeEndpoint', () => {
    it('should return error for unknown endpoint', async () => {
      mockEndpointLoader.getEndpoint.mockReturnValue(undefined);

      const result = await client.executeEndpoint('unknown_endpoint', {});

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.error).toContain('Unknown endpoint');
    });

    it('should execute GET endpoint successfully', async () => {
      // Mock the get method
      (client as any).get = jest.fn().mockResolvedValue({ catalogs: [] });

      const result = await client.executeEndpoint('get_catalogs', {
        queryParams: { count: 10, start: 0 },
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect((client as any).get).toHaveBeenCalledWith('/catalogs?count=10&start=0');
    });

    it('should execute POST endpoint successfully', async () => {
      // Mock the post method
      (client as any).post = jest.fn().mockResolvedValue({ hits: [] });

      const result = await client.executeEndpoint('search_products', {
        pathParams: { site_id: 'test-site' },
        body: { query: { match_all_query: {} } },
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect((client as any).post).toHaveBeenCalled();
    });

    it('should handle path parameters correctly', async () => {
      (client as any).get = jest.fn().mockResolvedValue({ product: {} });

      const result = await client.executeEndpoint('get_product', {
        pathParams: { product_id: 'PROD-123' },
      });

      expect(result.success).toBe(true);
      expect((client as any).get).toHaveBeenCalledWith('/products/PROD-123');
    });

    it('should handle query parameters correctly', async () => {
      (client as any).get = jest.fn().mockResolvedValue({ product: {} });

      const result = await client.executeEndpoint('get_product', {
        pathParams: { product_id: 'PROD-123' },
        queryParams: { expand: 'prices,images' },
      });

      expect(result.success).toBe(true);
      expect((client as any).get).toHaveBeenCalledWith('/products/PROD-123?expand=prices%2Cimages');
    });

    it('should handle API errors gracefully', async () => {
      (client as any).get = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await client.executeEndpoint('get_catalogs', {});

      expect(result.success).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe('API Error');
    });
  });

  describe('URL building', () => {
    it('should build URL with path parameters', async () => {
      (client as any).get = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('get_product', {
        pathParams: { product_id: 'test-product' },
      });

      expect((client as any).get).toHaveBeenCalledWith('/products/test-product');
    });

    it('should encode path parameters', async () => {
      (client as any).get = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('get_product', {
        pathParams: { product_id: 'product with spaces' },
      });

      expect((client as any).get).toHaveBeenCalledWith('/products/product%20with%20spaces');
    });

    it('should encode query parameters', async () => {
      (client as any).get = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('get_catalogs', {
        queryParams: { special: 'value&with=special' },
      });

      expect((client as any).get).toHaveBeenCalledWith('/catalogs?special=value%26with%3Dspecial');
    });

    it('should skip empty query parameters', async () => {
      (client as any).get = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('get_catalogs', {
        queryParams: { count: 10, empty: '', nullish: null as any },
      });

      expect((client as any).get).toHaveBeenCalledWith('/catalogs?count=10');
    });
  });

  describe('request body building', () => {
    it('should merge default body with provided body', async () => {
      (client as any).post = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('search_products', {
        pathParams: { site_id: 'test' },
        body: { custom_field: 'value' },
      });

      expect((client as any).post).toHaveBeenCalledWith(
        '/product_search',
        expect.objectContaining({
          query: { match_all_query: {} },
          count: 25,
          start: 0,
          custom_field: 'value',
        }),
      );
    });

    it('should use empty body when no default and no provided body', async () => {
      const endpointWithoutDefault: Endpoint = {
        ...mockPostEndpoint,
        defaultBody: undefined,
      };
      mockEndpointLoader.getEndpoint.mockReturnValue(endpointWithoutDefault);

      (client as any).post = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('search_products', {
        pathParams: { site_id: 'test' },
      });

      expect((client as any).post).toHaveBeenCalledWith('/product_search', {});
    });
  });

  describe('HTTP method handling', () => {
    it('should handle PUT requests', async () => {
      const putEndpoint: Endpoint = {
        ...mockGetEndpoint,
        toolName: 'update_item',
        method: 'PUT',
      };
      mockEndpointLoader.getEndpoint.mockReturnValue(putEndpoint);

      (client as any).put = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('update_item', { body: { data: 'test' } });

      expect((client as any).put).toHaveBeenCalled();
    });

    it('should handle PATCH requests', async () => {
      const patchEndpoint: Endpoint = {
        ...mockGetEndpoint,
        toolName: 'patch_item',
        method: 'PATCH',
      };
      mockEndpointLoader.getEndpoint.mockReturnValue(patchEndpoint);

      (client as any).patch = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('patch_item', { body: { data: 'test' } });

      expect((client as any).patch).toHaveBeenCalled();
    });

    it('should handle DELETE requests', async () => {
      const deleteEndpoint: Endpoint = {
        ...mockGetEndpoint,
        toolName: 'delete_item',
        method: 'DELETE',
      };
      mockEndpointLoader.getEndpoint.mockReturnValue(deleteEndpoint);

      (client as any).delete = jest.fn().mockResolvedValue({});

      await client.executeEndpoint('delete_item', {});

      expect((client as any).delete).toHaveBeenCalled();
    });

    it('should throw error for unsupported HTTP method', async () => {
      const invalidEndpoint: Endpoint = {
        ...mockGetEndpoint,
        method: 'INVALID' as any,
      };
      mockEndpointLoader.getEndpoint.mockReturnValue(invalidEndpoint);

      const result = await client.executeEndpoint('get_catalogs', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported HTTP method');
    });
  });

  describe('site ID management', () => {
    it('should get site ID', () => {
      expect(client.getSiteId()).toBe('test-site');
    });

    it('should set site ID', () => {
      client.setSiteId('new-site');
      expect(client.getSiteId()).toBe('new-site');
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      // Reset mocks and set up default behavior
      mockEndpointLoader.getEndpoint.mockImplementation((name: string) => {
        const endpoints: Record<string, Endpoint> = {
          get_catalogs: mockGetEndpoint,
          search_products: mockPostEndpoint,
          get_product: mockPathParamEndpoint,
          get_sites: { ...mockGetEndpoint, toolName: 'get_sites', path: '/sites' },
          get_site: { ...mockPathParamEndpoint, toolName: 'get_site', path: '/sites/{site_id}' },
          search_customers: { ...mockPostEndpoint, toolName: 'search_customers', path: '/customer_search' },
          search_orders: { ...mockPostEndpoint, toolName: 'search_orders', path: '/order_search' },
          get_order: { ...mockPathParamEndpoint, toolName: 'get_order', path: '/sites/{site_id}/orders/{order_no}', parameters: [{ name: 'site_id', description: '', type: 'string', required: true }, { name: 'order_no', description: '', type: 'string', required: true }] },
          search_custom_objects: { ...mockPostEndpoint, toolName: 'search_custom_objects', path: '/custom_objects/{object_type}' },
          get_custom_object: { ...mockPathParamEndpoint, toolName: 'get_custom_object', path: '/custom_objects/{object_type}/{key}' },
          get_inventory_lists: { ...mockGetEndpoint, toolName: 'get_inventory_lists', path: '/inventory_lists' },
          get_product_inventory: { ...mockPathParamEndpoint, toolName: 'get_product_inventory', path: '/inventory_lists/{inventory_list_id}/product_inventory_records/{product_id}' },
          get_price_books: { ...mockGetEndpoint, toolName: 'get_price_books', path: '/price_books' },
          search_campaigns: { ...mockPostEndpoint, toolName: 'search_campaigns', path: '/campaigns' },
          search_promotions: { ...mockPostEndpoint, toolName: 'search_promotions', path: '/promotions' },
          search_coupons: { ...mockPostEndpoint, toolName: 'search_coupons', path: '/coupons' },
          get_catalog: { ...mockPathParamEndpoint, toolName: 'get_catalog', path: '/catalogs/{catalog_id}' },
          get_categories: { ...mockPathParamEndpoint, toolName: 'get_categories', path: '/catalogs/{catalog_id}/categories' },
        };
        return endpoints[name];
      });
    });

    describe('searchProducts', () => {
      it('should search products with query', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchProducts('test-site', 'shoes', 10, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_products', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                search_phrase: 'shoes',
              }),
            }),
            count: 10,
            start: 0,
          }),
        });
      });

      it('should search products without query', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchProducts('test-site');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_products', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: { match_all_query: {} },
          }),
        });
      });
    });

    describe('getProduct', () => {
      it('should get product by ID', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getProduct('test-site', 'PROD-123');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_product', {
          pathParams: { site_id: 'test-site', product_id: 'PROD-123' },
          queryParams: undefined,
        });
      });

      it('should get product with expand parameter', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getProduct('test-site', 'PROD-123', 'prices,images');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_product', {
          pathParams: { site_id: 'test-site', product_id: 'PROD-123' },
          queryParams: { expand: 'prices,images' },
        });
      });
    });

    describe('getCatalogs', () => {
      it('should get catalogs with pagination', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getCatalogs(50, 10);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_catalogs', {
          queryParams: { count: 50, start: 10 },
        });
      });
    });

    describe('getCatalog', () => {
      it('should get specific catalog', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getCatalog('storefront-catalog');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_catalog', {
          pathParams: { catalog_id: 'storefront-catalog' },
        });
      });
    });

    describe('getCategories', () => {
      it('should get categories from catalog', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getCategories('catalog-1', 2, 50, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_categories', {
          pathParams: { catalog_id: 'catalog-1' },
          queryParams: { levels: 2, count: 50, start: 0 },
        });
      });
    });

    describe('getSites', () => {
      it('should get all sites', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getSites(25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_sites', {
          queryParams: { count: 25, start: 0 },
        });
      });
    });

    describe('getSite', () => {
      it('should get specific site', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getSite('RefArch');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_site', {
          pathParams: { site_id: 'RefArch' },
        });
      });
    });

    describe('searchCustomers', () => {
      it('should search customers with query', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchCustomers('test-site', 'john@example.com');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_customers', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                search_phrase: 'john@example.com',
              }),
            }),
          }),
        });
      });
    });

    describe('searchOrders', () => {
      it('should search orders', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchOrders('test-site', 'ORDER-123');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_orders', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                search_phrase: 'ORDER-123',
              }),
            }),
          }),
        });
      });
    });

    describe('getOrder', () => {
      it('should get specific order', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getOrder('test-site', 'ORDER-123');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_order', {
          pathParams: { site_id: 'test-site', order_no: 'ORDER-123' },
          queryParams: undefined,
        });
      });
    });

    describe('searchCustomObjects', () => {
      it('should search custom objects', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchCustomObjects('CustomType', 25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_custom_objects', {
          pathParams: { object_type: 'CustomType' },
          body: expect.objectContaining({
            query: { match_all_query: {} },
          }),
        });
      });
    });

    describe('getCustomObject', () => {
      it('should get specific custom object', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getCustomObject('CustomType', 'key-123');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_custom_object', {
          pathParams: { object_type: 'CustomType', key: 'key-123' },
        });
      });
    });

    describe('getInventoryLists', () => {
      it('should get inventory lists', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getInventoryLists(25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_inventory_lists', {
          queryParams: { count: 25, start: 0 },
        });
      });
    });

    describe('getProductInventory', () => {
      it('should get product inventory', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getProductInventory('inventory-list-1', 'PROD-123');

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_product_inventory', {
          pathParams: { inventory_list_id: 'inventory-list-1', product_id: 'PROD-123' },
        });
      });
    });

    describe('getPriceBooks', () => {
      it('should get price books', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.getPriceBooks(25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('get_price_books', {
          queryParams: { count: 25, start: 0 },
        });
      });
    });

    describe('searchCampaigns', () => {
      it('should search campaigns', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchCampaigns('test-site', 25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_campaigns', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: { match_all_query: {} },
          }),
        });
      });
    });

    describe('searchPromotions', () => {
      it('should search promotions', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchPromotions('test-site', undefined, 25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_promotions', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: { match_all_query: {} },
          }),
        });
      });

      it('should search promotions by campaign', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchPromotions('test-site', 'campaign-123', 25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_promotions', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: expect.objectContaining({
              term_query: expect.objectContaining({
                values: ['campaign-123'],
              }),
            }),
          }),
        });
      });
    });

    describe('searchCoupons', () => {
      it('should search coupons', async () => {
        (client as any).executeEndpoint = jest.fn().mockResolvedValue({ success: true, data: {} });

        await client.searchCoupons('test-site', 25, 0);

        expect((client as any).executeEndpoint).toHaveBeenCalledWith('search_coupons', {
          pathParams: { site_id: 'test-site' },
          body: expect.objectContaining({
            query: { match_all_query: {} },
          }),
        });
      });
    });
  });

  describe('getAvailableEndpoints', () => {
    it('should return available endpoints from loader', () => {
      const endpoints = client.getAvailableEndpoints();

      expect(mockEndpointLoader.getEndpoints).toHaveBeenCalled();
      expect(endpoints).toBeDefined();
    });
  });

  describe('hasEndpoint', () => {
    it('should check if endpoint exists', () => {
      mockEndpointLoader.hasEndpoint.mockReturnValue(true);

      const result = client.hasEndpoint('get_catalogs');

      expect(result).toBe(true);
      expect(mockEndpointLoader.hasEndpoint).toHaveBeenCalledWith('get_catalogs');
    });

    it('should return false for non-existent endpoint', () => {
      mockEndpointLoader.hasEndpoint.mockReturnValue(false);

      const result = client.hasEndpoint('non_existent');

      expect(result).toBe(false);
    });
  });
});
