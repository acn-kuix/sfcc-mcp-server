/**
 * Tests for DataAPIToolHandler
 * Tests Data API tool handling for OCAPI/SCAPI operations
 */

import { DataAPIToolHandler } from '../src/core/handlers/data-api-handler.js';
import { HandlerContext } from '../src/core/handlers/base-handler.js';
import { Logger } from '../src/utils/logger.js';

// Mock the DataAPIClient
const mockDataAPIClient = {
  executeEndpoint: jest.fn(),
  getSiteId: jest.fn(),
  setSiteId: jest.fn(),
  hasEndpoint: jest.fn(),
  getAvailableEndpoints: jest.fn(),
};

jest.mock('../src/clients/data-api-client.js', () => ({
  DataAPIClient: jest.fn(() => mockDataAPIClient),
}));

// Mock the EndpointLoader
const mockEndpointLoader = {
  getEndpoint: jest.fn(),
  getEndpoints: jest.fn(),
  hasEndpoint: jest.fn(),
  getToolNameSet: jest.fn(),
  getToolNames: jest.fn(),
};

jest.mock('../src/utils/endpoint-loader.js', () => ({
  EndpointLoader: {
    getInstance: jest.fn(() => mockEndpointLoader),
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

describe('DataAPIToolHandler', () => {
  let mockLogger: jest.Mocked<Logger>;
  let context: HandlerContext;
  let handler: DataAPIToolHandler;

  const toolNames = [
    'search_products',
    'get_product',
    'get_catalogs',
    'get_catalog',
    'get_categories',
    'get_category',
    'get_sites',
    'get_site',
    'search_campaigns',
    'get_campaign',
    'search_promotions',
    'search_coupons',
    'get_inventory_lists',
    'get_inventory_list',
    'get_product_inventory',
    'search_customers',
    'get_customer',
    'get_customer_groups',
    'search_custom_objects',
    'get_custom_object',
    'search_orders',
    'get_order',
    'get_locales',
    'get_currencies',
    'get_price_books',
    'get_price_book',
    'get_content_assets',
    'get_content_asset',
  ];

  const mockEndpoints = [
    {
      toolName: 'search_products',
      path: '/product_search',
      method: 'POST',
      parameters: [
        { name: 'site_id', type: 'string', required: true },
        { name: 'query', type: 'string', required: false },
        { name: 'count', type: 'number', required: false },
      ],
      defaultBody: { query: { match_all_query: {} }, count: 25, start: 0 },
      apiType: 'ocapi',
    },
    {
      toolName: 'get_product',
      path: '/products/{product_id}',
      method: 'GET',
      parameters: [
        { name: 'site_id', type: 'string', required: true },
        { name: 'product_id', type: 'string', required: true },
      ],
      apiType: 'ocapi',
    },
    {
      toolName: 'get_catalogs',
      path: '/catalogs',
      method: 'GET',
      parameters: [
        { name: 'count', type: 'number', required: false },
        { name: 'start', type: 'number', required: false },
      ],
      apiType: 'ocapi',
    },
    {
      toolName: 'search_promotions',
      path: '/promotions',
      method: 'POST',
      parameters: [
        { name: 'site_id', type: 'string', required: true },
        { name: 'campaign_id', type: 'string', required: false },
      ],
      defaultBody: { query: { match_all_query: {} } },
      apiType: 'ocapi',
    },
    {
      toolName: 'search_customers',
      path: '/customer_search',
      method: 'POST',
      parameters: [
        { name: 'site_id', type: 'string', required: true },
        { name: 'query', type: 'string', required: false },
        { name: 'count', type: 'number', required: false },
        { name: 'start', type: 'number', required: false },
      ],
      defaultBody: { query: { match_all_query: {} }, count: 25, start: 0 },
      apiType: 'ocapi',
    },
    {
      toolName: 'search_orders',
      path: '/order_search',
      method: 'POST',
      parameters: [
        { name: 'site_id', type: 'string', required: true },
        { name: 'query', type: 'string', required: false },
        { name: 'count', type: 'number', required: false },
        { name: 'start', type: 'number', required: false },
      ],
      defaultBody: { query: { match_all_query: {} }, count: 25, start: 0 },
      apiType: 'ocapi',
    },
  ];

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      timing: jest.fn(),
      methodEntry: jest.fn(),
      methodExit: jest.fn(),
      info: jest.fn(),
    } as any;

    jest.clearAllMocks();

    // Reset mock client
    mockDataAPIClient.executeEndpoint.mockReset();
    mockDataAPIClient.getSiteId.mockReset();
    mockDataAPIClient.hasEndpoint.mockReset();

    // Setup endpoint loader mock
    mockEndpointLoader.getToolNameSet.mockReturnValue(new Set(toolNames));
    mockEndpointLoader.getToolNames.mockReturnValue(toolNames);
    mockEndpointLoader.getEndpoint.mockImplementation((name: string) => {
      return mockEndpoints.find((e) => e.toolName === name);
    });
    mockEndpointLoader.hasEndpoint.mockImplementation((name: string) => {
      return toolNames.includes(name);
    });

    jest.spyOn(Logger, 'getChildLogger').mockReturnValue(mockLogger);

    context = {
      logger: mockLogger,
      config: {
        hostname: 'test.commercecloud.salesforce.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        siteId: 'test-site',
      },
      capabilities: { canAccessLogs: false, canAccessOCAPI: true },
    };

    handler = new DataAPIToolHandler(context, 'DataAPI');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper function to initialize handler for tests that need it
  const initializeHandler = async () => {
    await (handler as any).initialize();
  };

  describe('canHandle', () => {
    it('should handle all Data API tools', () => {
      for (const toolName of toolNames) {
        expect(handler.canHandle(toolName)).toBe(true);
      }
    });

    it('should not handle non-Data API tools', () => {
      expect(handler.canHandle('get_latest_error')).toBe(false);
      expect(handler.canHandle('unknown_tool')).toBe(false);
      expect(handler.canHandle('get_code_versions')).toBe(false);
    });
  });

  describe('initialization', () => {
    it('should initialize Data API client when OCAPI access is available', async () => {
      await initializeHandler();

      const MockedConstructor = jest.requireMock('../src/clients/data-api-client.js').DataAPIClient;
      expect(MockedConstructor).toHaveBeenCalledWith({
        hostname: 'test.commercecloud.salesforce.com',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        siteId: 'test-site',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('Data API client initialized');
    });

    it('should not initialize client when OCAPI access is not available', async () => {
      context.capabilities = { canAccessLogs: false, canAccessOCAPI: false };
      const handlerWithoutOCAPI = new DataAPIToolHandler(context, 'DataAPI');

      await (handlerWithoutOCAPI as any).initialize();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'OCAPI access not available - Data API handler will not be functional',
      );
    });
  });

  describe('disposal', () => {
    it('should dispose Data API handler properly', async () => {
      await initializeHandler();
      await (handler as any).dispose();

      expect(mockLogger.debug).toHaveBeenCalledWith('Data API handler disposed');
    });
  });

  describe('tool execution - Product Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { hits: [], total: 0 },
      });
    });

    it('should handle search_products', async () => {
      const args = { site_id: 'test-site', query: 'shoes', count: 25 };
      const result = await handler.handle('search_products', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_products',
        expect.any(Object),
      );
      expect(result.isError).toBe(false);
    });

    it('should handle get_product with validation', async () => {
      const args = { site_id: 'test-site', product_id: 'PROD-123' };
      const result = await handler.handle('get_product', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'get_product',
        expect.any(Object),
      );
      expect(result.isError).toBe(false);
    });

    it('should fail get_product without required args', async () => {
      const args = { site_id: 'test-site' }; // Missing product_id
      const result = await handler.handle('get_product', args, Date.now());

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('product_id');
    });
  });

  describe('tool execution - Catalog Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle get_catalogs', async () => {
      const result = await handler.handle('get_catalogs', {}, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'get_catalogs',
        expect.any(Object),
      );
      expect(result.isError).toBe(false);
    });

    it('should handle get_catalog with validation', async () => {
      const args = { catalog_id: 'storefront-catalog' };
      const result = await handler.handle('get_catalog', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should fail get_catalog without catalog_id', async () => {
      const result = await handler.handle('get_catalog', {}, Date.now());

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('catalog_id');
    });
  });

  describe('tool execution - Site Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle get_sites', async () => {
      const result = await handler.handle('get_sites', {}, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_site with validation', async () => {
      const args = { site_id: 'RefArch' };
      const result = await handler.handle('get_site', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('tool execution - Campaign and Promotion Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle search_campaigns', async () => {
      const args = { site_id: 'test-site' };
      const result = await handler.handle('search_campaigns', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle search_promotions', async () => {
      const args = { site_id: 'test-site' };
      const result = await handler.handle('search_promotions', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle search_promotions with campaign_id filter', async () => {
      const args = { site_id: 'test-site', campaign_id: 'campaign-123' };
      const result = await handler.handle('search_promotions', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle search_coupons', async () => {
      const args = { site_id: 'test-site' };
      const result = await handler.handle('search_coupons', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('tool execution - Inventory Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle get_inventory_lists', async () => {
      const result = await handler.handle('get_inventory_lists', {}, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_product_inventory with validation', async () => {
      const args = { inventory_list_id: 'inventory-1', product_id: 'PROD-123' };
      const result = await handler.handle('get_product_inventory', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('tool execution - Customer Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle search_customers', async () => {
      const args = { site_id: 'test-site', query: 'john@example.com' };
      const result = await handler.handle('search_customers', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_customer with validation', async () => {
      const args = { site_id: 'test-site', customer_id: 'CUST-123' };
      const result = await handler.handle('get_customer', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_customer_groups', async () => {
      const args = { site_id: 'test-site' };
      const result = await handler.handle('get_customer_groups', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('tool execution - Custom Object Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle search_custom_objects', async () => {
      const args = { object_type: 'CustomType' };
      const result = await handler.handle('search_custom_objects', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_custom_object with validation', async () => {
      const args = { object_type: 'CustomType', key: 'key-123' };
      const result = await handler.handle('get_custom_object', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should fail get_custom_object without key', async () => {
      const args = { object_type: 'CustomType' }; // Missing key
      const result = await handler.handle('get_custom_object', args, Date.now());

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('key');
    });
  });

  describe('tool execution - Order Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle search_orders', async () => {
      const args = { site_id: 'test-site' };
      const result = await handler.handle('search_orders', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_order with validation', async () => {
      const args = { site_id: 'test-site', order_no: 'ORDER-123' };
      const result = await handler.handle('get_order', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should fail get_order without order_no', async () => {
      const args = { site_id: 'test-site' }; // Missing order_no
      const result = await handler.handle('get_order', args, Date.now());

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('order_no');
    });
  });

  describe('tool execution - Price and Locale Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle get_locales', async () => {
      const result = await handler.handle('get_locales', {}, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_currencies', async () => {
      const result = await handler.handle('get_currencies', {}, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_price_books', async () => {
      const result = await handler.handle('get_price_books', {}, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_price_book with validation', async () => {
      const args = { price_book_id: 'usd-pricebook' };
      const result = await handler.handle('get_price_book', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('tool execution - Content Tools', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: { data: [] },
      });
    });

    it('should handle get_content_assets', async () => {
      const args = { library_id: 'SiteGenesis' };
      const result = await handler.handle('get_content_assets', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });

    it('should handle get_content_asset with validation', async () => {
      const args = { library_id: 'SiteGenesis', content_id: 'about-us' };
      const result = await handler.handle('get_content_asset', args, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalled();
      expect(result.isError).toBe(false);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await initializeHandler();
    });

    it('should handle client errors gracefully', async () => {
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: false,
        status: 500,
        error: 'API Error',
        data: null,
      });

      const result = await handler.handle('get_catalogs', {}, Date.now());

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('API Error');
    });

    it('should throw error for unsupported tools', async () => {
      await expect(handler.handle('unsupported_tool', {}, Date.now())).rejects.toThrow(
        'Unsupported tool',
      );
    });

    it('should handle Data API client not configured error', async () => {
      const contextWithoutOCAPI = {
        ...context,
        capabilities: { canAccessLogs: false, canAccessOCAPI: false },
      };
      const handlerWithoutOCAPI = new DataAPIToolHandler(contextWithoutOCAPI, 'DataAPI');

      const result = await handlerWithoutOCAPI.handle('get_catalogs', {}, Date.now());

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Data API client not initialized');
    });
  });

  describe('timing and logging', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: {},
      });
    });

    it('should log timing information', async () => {
      const startTime = Date.now();
      await handler.handle('get_catalogs', {}, startTime);

      expect(mockLogger.timing).toHaveBeenCalledWith('get_catalogs', startTime);
    });

    it('should log execution details', async () => {
      await handler.handle('get_catalogs', {}, Date.now());

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'get_catalogs completed successfully',
        expect.any(Object),
      );
    });
  });

  describe('request parameter building', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: {},
      });
    });

    it('should build path parameters correctly', async () => {
      await handler.handle('get_product', { site_id: 'test', product_id: 'PROD-123' }, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'get_product',
        expect.objectContaining({
          pathParams: expect.objectContaining({
            product_id: 'PROD-123',
          }),
        }),
      );
    });

    it('should build query parameters for GET requests', async () => {
      await handler.handle('get_catalogs', { count: 50, start: 10 }, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'get_catalogs',
        expect.objectContaining({
          queryParams: expect.objectContaining({
            count: 50,
            start: 10,
          }),
        }),
      );
    });

    it('should build body with search query for POST requests', async () => {
      await handler.handle(
        'search_products',
        { site_id: 'test', query: 'shoes', count: 25 },
        Date.now(),
      );

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_products',
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                search_phrase: 'shoes',
              }),
            }),
          }),
        }),
      );
    });

    it('should build body with expand array', async () => {
      await handler.handle(
        'search_products',
        { site_id: 'test', expand: 'prices,images,availability' },
        Date.now(),
      );

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_products',
        expect.objectContaining({
          body: expect.objectContaining({
            expand: ['prices', 'images', 'availability'],
          }),
        }),
      );
    });

    it('should build body with campaign_id term query for search_promotions', async () => {
      await handler.handle(
        'search_promotions',
        { site_id: 'test', campaign_id: 'summer-sale' },
        Date.now(),
      );

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_promotions',
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              term_query: expect.objectContaining({
                values: ['summer-sale'],
              }),
            }),
          }),
        }),
      );
    });
  });

  describe('search field configuration', () => {
    beforeEach(async () => {
      await initializeHandler();
      mockDataAPIClient.executeEndpoint.mockResolvedValue({
        success: true,
        status: 200,
        data: {},
      });
    });

    it('should use correct search fields for search_products', async () => {
      await handler.handle('search_products', { site_id: 'test', query: 'shoes' }, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_products',
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                fields: ['id', 'name'],
              }),
            }),
          }),
        }),
      );
    });

    it('should use correct search fields for search_customers', async () => {
      await handler.handle(
        'search_customers',
        { site_id: 'test', query: 'john@example.com' },
        Date.now(),
      );

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_customers',
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                fields: ['email', 'first_name', 'last_name'],
              }),
            }),
          }),
        }),
      );
    });

    it('should use correct search fields for search_orders', async () => {
      await handler.handle('search_orders', { site_id: 'test', query: 'ORDER-123' }, Date.now());

      expect(mockDataAPIClient.executeEndpoint).toHaveBeenCalledWith(
        'search_orders',
        expect.objectContaining({
          body: expect.objectContaining({
            query: expect.objectContaining({
              text_query: expect.objectContaining({
                fields: ['order_no', 'customer_email'],
              }),
            }),
          }),
        }),
      );
    });
  });
});
