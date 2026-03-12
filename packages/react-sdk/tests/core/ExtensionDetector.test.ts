import { ExtensionDetector } from '../../src/core/ExtensionDetector';

describe('ExtensionDetector', () => {
  let detector: ExtensionDetector;
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    detector = new ExtensionDetector();
    delete (global.window as any).__webble__;
    Object.defineProperty(global.navigator, 'bluetooth', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(global.navigator, 'webble', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(global.window, 'isSecureContext', {
      value: true,
      writable: true,
      configurable: true
    });
    
    // Setup spies
    addEventListenerSpy = jest.spyOn(window, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => null as any);
    
    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    delete (global.window as any).__webble__;
    Object.defineProperty(global.navigator, 'bluetooth', {
      value: undefined,
      writable: true,
      configurable: true
    });
    Object.defineProperty(global.navigator, 'webble', {
      value: undefined,
      writable: true,
      configurable: true
    });
  });

  describe('isInstalled', () => {
    it('should return true when window.__webble__ is set', () => {
      (global.window as any).__webble__ = true;

      expect(detector.isInstalled()).toBe(true);
    });

    it('should return true when navigator.bluetooth.__webble is set', () => {
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: { __webble: true },
        writable: true,
        configurable: true
      });

      expect(detector.isInstalled()).toBe(true);
    });

    it('should return false when no __webble markers exist', () => {
      // @ts-ignore
      delete global.navigator.bluetooth;
      
      expect(detector.isInstalled()).toBe(false);
    });

    it('should return false when navigator.bluetooth exists but has no __webble marker', () => {
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: {},
        writable: true,
        configurable: true
      });

      expect(detector.isInstalled()).toBe(false);
    });

    it('should cache the detection result', () => {
      (global.window as any).__webble__ = true;

      expect(detector.isInstalled()).toBe(true);
      
      // Remove the marker
      delete (global.window as any).__webble__;
      
      // Should still return true due to caching
      expect(detector.isInstalled()).toBe(true);
    });

    it('should handle missing navigator bluetooth/webble markers', () => {
      expect(detector.isInstalled()).toBe(false);
    });
  });

  describe('detect', () => {
    it('should resolve immediately if already detected', async () => {
      (global.window as any).__webble__ = true;

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
      
      expect(promise1).toBe(promise2); // Should be the same in-flight promise
      
      jest.advanceTimersByTime(3000);
      
      const result1 = await promise1;
      const result2 = await promise2;
      
      expect(result1).toBe(result2);
      expect(addEventListenerSpy).toHaveBeenCalledTimes(1); // Only one detection
    });

    it('should return false when markers remain unavailable through timeout', async () => {
      const detectPromise = detector.detect();
      jest.advanceTimersByTime(3000);
      const result = await detectPromise;
      expect(result).toBe(false);
    });

    it('should detect when __webble marker becomes available during detection', async () => {
      // @ts-ignore
      delete global.navigator.bluetooth;

      const detectPromise = detector.detect();
      
      // Simulate extension setting the __webble__ marker
      (global.window as any).__webble__ = true;
      
      // Timeout check calls isInstalled again
      jest.advanceTimersByTime(3000);
      
      const result = await detectPromise;
      expect(result).toBe(true);
    });
  });

  describe('getInstallationInstructions', () => {
    it('should return iOSWebBLE installation instructions', () => {
      const instructions = detector.getInstallationInstructions();
      expect(instructions).toContain('iOSWebBLE');
      expect(instructions).toContain('aA in the address bar');
      expect(instructions).toContain('App Store');
    });

    it('should include extension enable steps', () => {
      const instructions = detector.getInstallationInstructions();
      expect(instructions).toContain('Manage Extensions');
      expect(instructions).toContain('Always Allow');
      expect(instructions).toContain('Refresh this page');
    });

    it('should return the same instructions regardless of user agent', () => {
      // Instructions are no longer platform-specific
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        writable: true,
        configurable: true
      });

      const macInstructions = detector.getInstallationInstructions();
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true
      });

      const winInstructions = detector.getInstallationInstructions();
      
      expect(macInstructions).toBe(winInstructions);
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
        'https://apps.apple.com/app/ioswebble/id0000000000',
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
        'https://apps.apple.com/app/ioswebble/id0000000000',
        '_blank'
      );
    });

    it('should open ioswebble.com for macOS', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        writable: true,
        configurable: true
      });

      detector.openExtensionStore();
      
      expect(openSpy).toHaveBeenCalledWith(
        'https://ioswebble.com',
        '_blank'
      );
    });

    it('should open ioswebble.com for other platforms', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true
      });

      detector.openExtensionStore();
      
      expect(openSpy).toHaveBeenCalledWith(
        'https://ioswebble.com',
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
      Object.defineProperty(global.window, 'isSecureContext', {
        value: false,
        writable: true,
        configurable: true
      });
      
      expect(detector.isBrowserSupported()).toBe(false);
    });

    it('should return true for Safari', () => {
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
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
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
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
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
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
      Object.defineProperty(global.window, 'isSecureContext', {
        value: false,
        writable: true,
        configurable: true
      });

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toContain('secure context');
      expect(message).toContain('HTTPS or localhost');
    });

    it('should return Safari extension message when not installed', () => {
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
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
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
        writable: true,
        configurable: true
      });
      
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15',
        writable: true,
        configurable: true
      });
      
      // Set __webble marker so isInstalled() returns true
      Object.defineProperty(global.navigator, 'bluetooth', {
        value: { __webble: true },
        writable: true,
        configurable: true
      });

      // Force detection
      detector.isInstalled();

      const message = detector.getBrowserCompatibilityMessage();
      expect(message).toBeNull();
    });

    it('should return unsupported browser message', () => {
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
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
      Object.defineProperty(global.window, 'isSecureContext', {
        value: true,
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
