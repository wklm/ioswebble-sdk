# Changelog

All notable changes to @wklm/react will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.1] - 2025-01-27

### Added
- Initial beta release of @wklm/react SDK
- Core React hooks for Web Bluetooth operations:
  - `useBluetooth` - Main Bluetooth API hook
  - `useDevice` - Device management hook
  - `useCharacteristic` - Characteristic read/write operations
  - `useNotifications` - Real-time notifications
  - `useScan` - BLE device scanning
  - `useConnection` - Connection management
- UI Components:
  - `DeviceScanner` - Full-featured device selection UI
  - `ServiceExplorer` - GATT service/characteristic explorer
  - `ConnectionStatus` - Connection state indicator
  - `InstallationWizard` - Extension installation helper
- Core Features:
  - Auto-reconnection with exponential backoff
  - Connection quality monitoring
  - GATT caching with TTL
  - Full TypeScript support
  - Comprehensive error handling
  - 89.23% test coverage
- Example Applications:
  - Heart Rate Monitor with data recording and export
- Documentation:
  - Comprehensive README with quick start guide
  - Full API documentation
  - Migration guide from vanilla JavaScript

### Security
- Origin validation for all Bluetooth requests
- Permission management per device
- Message sanitization and validation
- Rate limiting and circuit breaker patterns

### Performance
- Bundle size <50KB gzipped
- Tree-shaking support
- Lazy loading for components
- Efficient re-render optimization

### Testing
- 329 unit tests all passing
- 89.23% code coverage
- Full mocking of Web Bluetooth API
- Comprehensive test utilities

## [Unreleased]

### Planned for 1.0.0
- Additional example applications
- Performance optimizations
- Extended browser compatibility
- Improved error messages
- Developer tools integration