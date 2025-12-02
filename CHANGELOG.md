# Changelog

All notable changes to this project will be documented in this file.

The format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-28
### Added
- **OCAPI Data API Integration**: Comprehensive OCAPI Data API support with 28 new tools for accessing SFCC data:
  - **Product & Catalog Tools**: `search_products`, `get_product`, `get_catalogs`, `get_catalog`, `get_categories`, `get_category`
  - **Site & Configuration Tools**: `get_sites`, `get_site`, `get_locales`, `get_currencies`, `get_price_books`, `get_price_book`
  - **Marketing Tools**: `search_campaigns`, `get_campaign`, `search_promotions`, `search_coupons`
  - **Inventory Tools**: `get_inventory_lists`, `get_inventory_list`, `get_product_inventory`
  - **Customer & Order Tools**: `search_customers`, `get_customer`, `get_customer_groups`, `search_orders`, `get_order`
  - **Custom Object & Content Tools**: `search_custom_objects`, `get_custom_object`, `get_content_assets`, `get_content_asset`
- **SCAPI Configuration Support**: Added `short-code` and `organization-id` configuration options for future SCAPI integration
- **Endpoint Loader**: Dynamic endpoint configuration via `endpoints.json` for extensible API support
- **Data API Client**: Unified client for OCAPI/SCAPI requests with automatic authentication handling

### Changed
- **Tool Count**: Expanded from 36 to 64 tools in Full Mode
- **Configuration Factory**: Enhanced to support SCAPI credentials (shortCode, organizationId)
- **Type Definitions**: Extended with endpoint, parameter, and API response types

### Documentation
- **README.md**: Comprehensive update with OCAPI Data API tools documentation
- **OCAPI Configuration Guide**: Added Business Manager OCAPI settings examples
- **Example Interactions**: New examples for Data API tools usage

### Notes
- Major feature release adding comprehensive OCAPI Data API support
- Foundation for future SCAPI integration
- Repository migrated to https://github.com/acn-kuix/sfcc-mcp-server

## [1.0.x] - Prior Releases

All releases from v1.0.0 to v1.0.15 were developed in the original repository.

### Summary of Features (v1.0.0 - v1.0.15)
- **Core MCP Server**: Base server implementation with stdio transport
- **SFCC Documentation Tools**: Complete API class information, method search, namespace exploration
- **Best Practices Guides**: Cartridges, hooks, controllers, security, performance, ISML templates
- **SFRA Documentation**: Enhanced Storefront Reference Architecture documentation
- **Log Analysis Tools**: Real-time error monitoring, pattern matching, system health analysis
- **Job Log Tools**: Job log analysis, execution summaries, custom job step debugging
- **System Object Tools**: Custom attribute discovery, site preference management, schema exploration
- **Code Version Tools**: Code version management and deployment activation
- **OCAPI Integration**: OAuth authentication, system objects, site preferences
- **Testing Framework**: Jest unit tests, Aegis MCP testing, OCAPI mock server
- **Documentation Site**: React/Vite architecture with comprehensive guides

### Key Milestones
- **v1.0.0** (2025-08-08): Initial release with core server and documentation tools
- **v1.0.9** (2025-08-13): Major architecture refactor with modular handlers
- **v1.0.12** (2025-08-19): Code version management
- **v1.0.14** (2025-09-16): Documentation site expansion with React/Vite
- **v1.0.15** (2025-10-03): Aegis testing framework, SFRA best practices expansion

For detailed changelog of prior releases, see the original repository:
https://github.com/taurgis/sfcc-dev-mcp/blob/main/CHANGELOG.md

---

### Comparison Links
[1.1.0]: https://github.com/acn-kuix/sfcc-mcp-server/compare/v1.0.15...v1.1.0
[1.0.x]: https://github.com/taurgis/sfcc-dev-mcp/blob/main/CHANGELOG.md
