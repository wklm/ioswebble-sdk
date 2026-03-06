import { ExtensionDetector } from '../../src/core/ExtensionDetector';

describe('ExtensionDetector', () => {
  let detector: ExtensionDetector;
  let originalNavigator: any;
  let originalWindow: any;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;
  let postMessageSpy: jest.SpyInstance;
  let openSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    detector = new ExtensionDetector();
    originalNavigator = global.navigator;
    originalWindow = global.window;
    
    // Setup spies
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    postMessageSpy = jest.spyOn(window, 'postMessage');
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null as any);
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    
    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true
    });
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
  });

  describe('isInstalled', () => {
    it('should return true when navigator.bluetooth exists', () => {
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      expect(detector.isInstalled()).toBe(true);
    });

    it('should return false when navigator.bluetooth does not exist', () => {
      // @ts-ignore
      delete global.navigator.bluetooth;
      
      expect(detector.isInstalled()).toBe(false);
    });

    it('should cache the detection result', () => {
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      expect(detector.isInstalled()).toBe(true);
      
      // Remove bluetooth API
      // @ts-ignore
      delete global.navigator.bluetooth;
      
      // Should still return true due to caching
      expect(detector.isInstalled()).toBe(true);
    });

    it('should handle undefined navigator', () => {
      Object.defineProperty(global, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true
      });

      expect(detector.isInstalled()).toBe(false);
    });
  });

  describe('detect', () => {
    it('should resolve immediately if already detected', async () => {
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      // First detection sets the flag
      detector.isInstalled();
      
      const result = await detector.detect();
      expect(result).toBe(true);
      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should listen for extension ready event', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const detectPromise = detector.detect();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'webble:extension:ready',
        expect.any(Function)
      );

      // Simulate extension ready event
      const handler = addEventListenerSpy.mock.calls[0][1];
      handler();

      const result = await detectPromise;
      expect(result).toBe(true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webble:extension:ready',
        expect.any(Function)
      );
    });

    it('should send ping message to extension', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      detector.detect();
      
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'webble:ping',
          source: 'webble-react-sdk'
        },
        '*'
      );
    });

    it('should timeout after DETECTION_TIMEOUT', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const detectPromise = detector.detect();
      
      // Fast-forward time by timeout duration
      jest.advanceTimersByTime(3000);
      
      const result = await detectPromise;
      expect(result).toBe(false);
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should handle concurrent detection calls', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const promise1 = detector.detect();
      const promise2 = detector.detect();
      
      expect(promise1).toStrictEqual(promise2); // Should be the same promise
      
      jest.advanceTimersByTime(3000);
      
      const result1 = await promise1;
      const result2 = await promise2;
      
      expect(result1).toBe(result2);
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1); // Only one detection
    });

    it('should handle ping errors gracefully', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;
      
      postMessageSpy.mockImplementation(() => {
        throw new Error('PostMessage failed');
      });

      const detectPromise = detector.detect();
      
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to ping extension:',
        expect.any(Error)
      );
      
      jest.advanceTimersByTime(3000);
      
      const result = await detectPromise;
      expect(result).toBe(false);
    });

    it('should handle undefined window', async () => {
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const detectPromise = detector.detect();
      jest.advanceTimersByTime(3000);
      
      const result = await detectPromise;
      expect(result).toBe(false);
    });

    it('should detect when bluetooth becomes available during detection', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const detectPromise = detector.detect();
      
      // Simulate bluetooth becoming available
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });
      
      // Timeout check calls isInstalled again
      jest.advanceTimersByTime(3000);
      
      const result = await detectPromise;
      expect(result).toBe(true);
    });
  });

  describe('getInstallationInstructions', () => {
    it('should return iOS instructions for iPhone', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
        configurable: true
      });

      const instructions = detector.getInstallationInstructions();
      expect(instructions).toContain('iOS');
      expect(instructions).toContain('App Store');
      expect(instructions).toContain('Settings > Safari > Extensions');
    });

    it('should return iOS instructions for iPad', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true,
        configurable: true
      });

      const instructions = detector.getInstallationInstructions();
      expect(instructions).toContain('iOS');
      expect(instructions).toContain('App Store');
    });

    it('should return macOS instructions for Mac', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        writable: true,
        configurable: true
      });

      const instructions = detector.getInstallationInstructions();
      expect(instructions).toContain('macOS');
      expect(instructions).toContain('Mac App Store');
      expect(instructions).toContain('Safari > Preferences > Extensions');
    });

    it('should return generic instructions for other platforms', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true
      });

      const instructions = detector.getInstallationInstructions();
      expect(instructions).toContain('browser');
      expect(instructions).not.toContain('iOS');
      expect(instructions).not.toContain('macOS');
    });
  });

  describe('openExtensionStore', () => {
    it('should open iOS App Store for iPhone', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
        configurable: true
      });

      detector.openExtensionStore();
      
      expect(openSpy).toHaveBeenCalledWith(
        'https://apps.apple.com/app/webble-safari-extension',
        '_blank'
      );
    });

    it('should open iOS App Store for iPad', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        writable: true,
        configurable: true
      });

      detector.openExtensionStore();
      
      expect(openSpy).toHaveBeenCalledWith(
        'https://apps.apple.com/app/webble-safari-extension',
        '_blank'
      );
    });

    it('should open Mac App Store for macOS', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        writable: true,
        configurable: true
      });

      detector.openExtensionStore();
      
      expect(openSpy).toHaveBeenCalledWith(
        'https://apps.apple.com/app/webble-safari-extension',
        '_blank'
      );
    });

    it('should open GitHub for other platforms', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true
      });

      detector.openExtensionStore();
      
      expect(openSpy).toHaveBeenCalledWith(
        'https://github.com/yourusername/webble-extension',
        '_blank'
      );
    });
  });

  describe('isBrowserSupported', () => {
    let originalIsSecureContext: any;

    beforeEach(() => {
      // Save the original value
      originalIsSecureContext = global.window?.isSecureContext;
    });

    afterEach(() => {
      // Try to restore the original value
      if (originalIsSecureContext !== undefined) {
        try {
          Object.defineProperty(global.window, 'isSecureContext', {
            value: originalIsSecureContext,
            writable: true,
            configurable: true
          });
        } catch (e) {
          // Can't restore, just continue
        }
      }
    });

    it('should return false for insecure context', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: false
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      expect(detector.isBrowserSupported()).toBe(false);
    });

    it('should return true for Safari', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        writable: true,
        configurable: true
      });

      expect(detector.isBrowserSupported()).toBe(true);
    });

    it('should return true for Chrome with bluetooth API', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124',
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      expect(detector.isBrowserSupported()).toBe(true);
    });

    it('should return false for non-Safari browser without bluetooth API', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true,
        configurable: true
      });
      
      // @ts-ignore
      delete global.navigator.bluetooth;

      expect(detector.isBrowserSupported()).toBe(false);
    });
  });

  describe('getBrowserCompatibilityMessage', () => {
    let originalIsSecureContext: any;

    beforeEach(() => {
      // Save the original value
      originalIsSecureContext = global.window?.isSecureContext;
    });

    afterEach(() => {
      // Try to restore the original value
      if (originalIsSecureContext !== undefined) {
        try {
          Object.defineProperty(global.window, 'isSecureContext', {
            value: originalIsSecureContext,
            writable: true,
            configurable: true
          });
        } catch (e) {
          // Can't restore, just continue
        }
      }
    });

    it('should return insecure context message', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: false
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toContain('secure context');
      expect(message).toContain('HTTPS or localhost');
    });

    it('should return Safari extension message when not installed', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        writable: true,
        configurable: true
      });
      
      // @ts-ignore
      delete global.navigator.bluetooth;

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toContain('Safari requires the WebBLE extension');
    });

    it('should return null for Safari with extension installed', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      // Force detection
      detector.isInstalled();

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toBeNull();
    });

    it('should return unsupported browser message', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        writable: true,
        configurable: true
      });
      
      // @ts-ignore
      delete global.navigator.bluetooth;

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toContain('browser does not support Web Bluetooth');
    });

    it('should return null for supported browser with bluetooth API', () => {
      // Create a new window-like object with isSecureContext
      const mockWindow = {
        ...global.window,
        isSecureContext: true
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0',
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple rapid detections', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(detector.detect());
      }

      jest.advanceTimersByTime(3000);
      
      const results = await Promise.all(promises);
      results.forEach(result => expect(result).toBe(false));
      
      // Should only add one event listener
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1);
    });

    it('should reset detection promise after completion', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const detectPromise1 = detector.detect();
      jest.advanceTimersByTime(3000);
      await detectPromise1;
      
      // Second detection should start fresh
      const detectPromise2 = detector.detect();
      expect(addEventListenerSpy).toHaveBeenCalledTimes(2);
      
      jest.advanceTimersByTime(3000);
      await detectPromise2;
    });

    it('should handle event firing after timeout', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const detectPromise = detector.detect();
      const handler = addEventListenerSpy.mock.calls[0][1];
      
      jest.advanceTimersByTime(3000);
      await detectPromise;
      
      // Event fires after timeout - should be ignored
      expect(() => handler()).not.toThrow();
    });
  });
});