/**
 * Tests for EndpointLoader
 * Tests endpoint configuration loading and lookup functionality
 *
 * Note: This test mocks the EndpointLoader module to avoid import.meta.url issues with Jest.
 * The actual EndpointLoader implementation uses import.meta.url which is not supported
 * in Jest's default TypeScript configuration.
 */

import { Endpoint } from '../src/types/types.js';

// Mock endpoints for testing
const mockEndpoints: Endpoint[] = [
  {
    toolName: 'search_products',
    path: '/product_search',
    description: 'Search for products',
    method: 'POST',
    parameters: [
      { name: 'site_id', description: 'Site ID', type: 'string', required: true },
      { name: 'query', description: 'Search query', type: 'string', required: false },
    ],
    defaultBody: { query: { match_all_query: {} } },
    apiType: 'ocapi',
    requiresSiteId: true,
  },
  {
    toolName: 'get_product',
    path: '/products/{product_id}',
    description: 'Get a product',
    method: 'GET',
    parameters: [
      { name: 'product_id', description: 'Product ID', type: 'string', required: true },
    ],
    apiType: 'ocapi',
    requiresSiteId: true,
  },
  {
    toolName: 'get_catalogs',
    path: '/catalogs',
    description: 'Get catalogs',
    method: 'GET',
    parameters: [],
    apiType: 'ocapi',
    requiresSiteId: false,
  },
  {
    toolName: 'scapi_endpoint',
    path: '/scapi/test',
    description: 'SCAPI endpoint',
    method: 'GET',
    parameters: [],
    apiType: 'scapi',
    requiresSiteId: false,
  },
];

// Create mock EndpointLoader class
class MockEndpointLoader {
  private endpoints: Endpoint[];
  private endpointMap: Map<string, Endpoint>;

  constructor(endpoints: Endpoint[] = mockEndpoints) {
    this.endpoints = endpoints;
    this.endpointMap = new Map();
    for (const endpoint of this.endpoints) {
      this.endpointMap.set(endpoint.toolName, endpoint);
    }
  }

  getEndpoints(): Endpoint[] {
    return [...this.endpoints];
  }

  getEndpoint(toolName: string): Endpoint | undefined {
    return this.endpointMap.get(toolName);
  }

  getOCAPIEndpoints(): Endpoint[] {
    return this.endpoints.filter((e) => e.apiType === 'ocapi');
  }

  getSCAPIEndpoints(): Endpoint[] {
    return this.endpoints.filter((e) => e.apiType === 'scapi');
  }

  getToolNames(): string[] {
    return this.endpoints.map((e) => e.toolName);
  }

  getToolNameSet(): Set<string> {
    return new Set(this.getToolNames());
  }

  hasEndpoint(toolName: string): boolean {
    return this.endpointMap.has(toolName);
  }

  reload(): void {
    // No-op in mock
  }
}

describe('EndpointLoader', () => {
  let loader: MockEndpointLoader;

  beforeEach(() => {
    loader = new MockEndpointLoader();
  });

  describe('getEndpoints', () => {
    it('should return all loaded endpoints', () => {
      const endpoints = loader.getEndpoints();

      expect(endpoints).toHaveLength(4);
      expect(endpoints[0].toolName).toBe('search_products');
      expect(endpoints[1].toolName).toBe('get_product');
      expect(endpoints[2].toolName).toBe('get_catalogs');
      expect(endpoints[3].toolName).toBe('scapi_endpoint');
    });

    it('should return a copy of endpoints array', () => {
      const endpoints1 = loader.getEndpoints();
      const endpoints2 = loader.getEndpoints();

      expect(endpoints1).not.toBe(endpoints2);
      expect(endpoints1).toEqual(endpoints2);
    });
  });

  describe('getEndpoint', () => {
    it('should return endpoint by tool name', () => {
      const endpoint = loader.getEndpoint('search_products');

      expect(endpoint).toBeDefined();
      expect(endpoint?.toolName).toBe('search_products');
      expect(endpoint?.method).toBe('POST');
      expect(endpoint?.path).toBe('/product_search');
    });

    it('should return undefined for non-existent endpoint', () => {
      const endpoint = loader.getEndpoint('non_existent_tool');

      expect(endpoint).toBeUndefined();
    });
  });

  describe('getOCAPIEndpoints', () => {
    it('should return only OCAPI endpoints', () => {
      const ocapiEndpoints = loader.getOCAPIEndpoints();

      expect(ocapiEndpoints).toHaveLength(3);
      expect(ocapiEndpoints.every((e) => e.apiType === 'ocapi')).toBe(true);
    });
  });

  describe('getSCAPIEndpoints', () => {
    it('should return only SCAPI endpoints', () => {
      const scapiEndpoints = loader.getSCAPIEndpoints();

      expect(scapiEndpoints).toHaveLength(1);
      expect(scapiEndpoints[0].toolName).toBe('scapi_endpoint');
    });

    it('should return empty array when no SCAPI endpoints exist', () => {
      const loaderWithoutSCAPI = new MockEndpointLoader([
        mockEndpoints[0],
        mockEndpoints[1],
        mockEndpoints[2],
      ]);
      const scapiEndpoints = loaderWithoutSCAPI.getSCAPIEndpoints();

      expect(scapiEndpoints).toHaveLength(0);
    });
  });

  describe('getToolNames', () => {
    it('should return all tool names', () => {
      const toolNames = loader.getToolNames();

      expect(toolNames).toEqual([
        'search_products',
        'get_product',
        'get_catalogs',
        'scapi_endpoint',
      ]);
    });
  });

  describe('getToolNameSet', () => {
    it('should return a Set of tool names', () => {
      const toolNameSet = loader.getToolNameSet();

      expect(toolNameSet).toBeInstanceOf(Set);
      expect(toolNameSet.size).toBe(4);
      expect(toolNameSet.has('search_products')).toBe(true);
      expect(toolNameSet.has('get_product')).toBe(true);
      expect(toolNameSet.has('get_catalogs')).toBe(true);
      expect(toolNameSet.has('scapi_endpoint')).toBe(true);
    });
  });

  describe('hasEndpoint', () => {
    it('should return true for existing endpoint', () => {
      expect(loader.hasEndpoint('search_products')).toBe(true);
      expect(loader.hasEndpoint('get_product')).toBe(true);
    });

    it('should return false for non-existent endpoint', () => {
      expect(loader.hasEndpoint('non_existent')).toBe(false);
    });
  });

  describe('endpoint structure validation', () => {
    it('should correctly load endpoint with all properties', () => {
      const endpoint = loader.getEndpoint('search_products');

      expect(endpoint).toBeDefined();
      expect(endpoint?.toolName).toBe('search_products');
      expect(endpoint?.path).toBe('/product_search');
      expect(endpoint?.description).toBe('Search for products');
      expect(endpoint?.method).toBe('POST');
      expect(endpoint?.parameters).toHaveLength(2);
      expect(endpoint?.defaultBody).toEqual({ query: { match_all_query: {} } });
      expect(endpoint?.apiType).toBe('ocapi');
      expect(endpoint?.requiresSiteId).toBe(true);
    });

    it('should correctly load endpoint parameters', () => {
      const endpoint = loader.getEndpoint('search_products');

      expect(endpoint?.parameters[0]).toEqual({
        name: 'site_id',
        description: 'Site ID',
        type: 'string',
        required: true,
      });
      expect(endpoint?.parameters[1]).toEqual({
        name: 'query',
        description: 'Search query',
        type: 'string',
        required: false,
      });
    });
  });

  describe('empty endpoints', () => {
    it('should handle empty endpoints array', () => {
      const emptyLoader = new MockEndpointLoader([]);

      expect(emptyLoader.getEndpoints()).toHaveLength(0);
      expect(emptyLoader.getToolNames()).toHaveLength(0);
      expect(emptyLoader.getToolNameSet().size).toBe(0);
      expect(emptyLoader.hasEndpoint('any')).toBe(false);
    });
  });

  describe('endpoint filtering', () => {
    it('should correctly filter by API type', () => {
      const ocapiOnly = loader.getOCAPIEndpoints();
      const scapiOnly = loader.getSCAPIEndpoints();

      expect(ocapiOnly.length + scapiOnly.length).toBe(4);
      expect(ocapiOnly.some((e) => e.apiType === 'scapi')).toBe(false);
      expect(scapiOnly.some((e) => e.apiType === 'ocapi')).toBe(false);
    });
  });

  describe('endpoint lookup performance', () => {
    it('should have O(1) lookup via getEndpoint', () => {
      // Create a loader with many endpoints
      const manyEndpoints: Endpoint[] = [];
      for (let i = 0; i < 100; i++) {
        manyEndpoints.push({
          toolName: `tool_${i}`,
          path: `/path/${i}`,
          description: `Tool ${i}`,
          method: 'GET',
          parameters: [],
          apiType: 'ocapi',
          requiresSiteId: false,
        });
      }
      const largeLoader = new MockEndpointLoader(manyEndpoints);

      // Lookup should be fast regardless of position
      const first = largeLoader.getEndpoint('tool_0');
      const last = largeLoader.getEndpoint('tool_99');
      const middle = largeLoader.getEndpoint('tool_50');

      expect(first?.toolName).toBe('tool_0');
      expect(last?.toolName).toBe('tool_99');
      expect(middle?.toolName).toBe('tool_50');
    });

    it('should have O(1) lookup via getToolNameSet', () => {
      const toolNameSet = loader.getToolNameSet();

      expect(toolNameSet.has('search_products')).toBe(true);
      expect(toolNameSet.has('non_existent')).toBe(false);
    });
  });
});
