import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WebBLEProvider, useWebBLE } from '../../src/core/WebBLEProvider';
import { WebBLEClient } from '../../src/core/WebBLEClient';

// Mock WebBLEClient
jest.mock('../../src/core/WebBLEClient');

const MockedWebBLEClient = WebBLEClient as jest.MockedClass<typeof WebBLEClient>;

describe('WebBLEProvider', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    MockedWebBLEClient.prototype.requestDevice = jest.fn().mockResolvedValue(null);
    MockedWebBLEClient.prototype.getDevices = jest.fn().mockResolvedValue([]);
    MockedWebBLEClient.prototype.requestLEScan = jest.fn().mockResolvedValue(null);
  });
  describe('Provider Component', () => {
    it('should render children', () => {
      render(
        <WebBLEProvider>
          <div>Test Child</div>
        </WebBLEProvider>
      );
      
      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should provide context to children', () => {
      const TestComponent = () => {
        const context = useWebBLE();
        return <div>{context ? 'Context Available' : 'No Context'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      expect(screen.getByText('Context Available')).toBeInTheDocument();
    });

    it('should detect extension availability on mount', async () => {
      const mockGetAvailability = jest.fn().mockResolvedValue(true);
      if (navigator.bluetooth) {
        navigator.bluetooth.getAvailability = mockGetAvailability;
      }

      const TestComponent = () => {
        const { isAvailable } = useWebBLE();
        return <div>{isAvailable ? 'Available' : 'Not Available'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
      
      expect(mockGetAvailability).toHaveBeenCalledTimes(1);
    });

    it('should detect extension installation status', async () => {
      const TestComponent = () => {
        const { isExtensionInstalled } = useWebBLE();
        return <div>{isExtensionInstalled ? 'Extension Installed' : 'Extension Not Installed'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      // In test environment with mocked navigator.bluetooth, extension is detected as installed
      expect(screen.getByText('Extension Installed')).toBeInTheDocument();
      
      // Verify that the extension is detected via the presence of navigator.bluetooth
      expect(navigator.bluetooth).toBeDefined();
    });

    it('should handle initialization errors gracefully', async () => {
      const mockGetAvailability = jest.fn().mockRejectedValue(new Error('Bluetooth not available'));
      if (navigator.bluetooth) {
        navigator.bluetooth.getAvailability = mockGetAvailability;
      }

      const TestComponent = () => {
        const { isAvailable, error } = useWebBLE();
        return (
          <div>
            <div>{isAvailable ? 'Available' : 'Not Available'}</div>
            {error && <div>Error: {error.message}</div>}
          </div>
        );
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Not Available')).toBeInTheDocument();
        expect(screen.getByText('Error: Bluetooth not available')).toBeInTheDocument();
      });
    });

    it('should memoize context value properly', async () => {
      let renderCount = 0;
      
      const TestComponent = () => {
        const context = useWebBLE();
        React.useEffect(() => {
          renderCount++;
        });
        
        return <div data-testid="render-count">{renderCount}</div>;
      };

      const { rerender } = render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      // Wait for initial render and async initialization
      await waitFor(() => {
        expect(renderCount).toBeGreaterThan(0);
      });
      
      const initialRenderCount = renderCount;

      // Re-render with same provider
      rerender(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      // Should not trigger additional renders beyond the rerender itself
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 1);
    });

    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(
        <WebBLEProvider>
          <div>Test</div>
        </WebBLEProvider>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'webble:extension:ready',
        expect.any(Function)
      );
    });

    it('should pass configuration options', () => {
      const config = {
        autoConnect: true,
        cacheTimeout: 5000,
        retryAttempts: 3
      };

      const TestComponent = () => {
        const { config: contextConfig } = useWebBLE();
        return <div>{JSON.stringify(contextConfig)}</div>;
      };

      render(
        <WebBLEProvider config={config}>
          <TestComponent />
        </WebBLEProvider>
      );

      expect(screen.getByText(JSON.stringify(config))).toBeInTheDocument();
    });

    it('should handle loading states', async () => {
      // Mock a slow availability check
      const mockGetAvailability = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      if (navigator.bluetooth) {
        navigator.bluetooth.getAvailability = mockGetAvailability;
      }

      const TestComponent = () => {
        const { isLoading } = useWebBLE();
        return <div>{isLoading ? 'Loading' : 'Ready'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      expect(screen.getByText('Loading')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Ready')).toBeInTheDocument();
      });
    });
  });

  describe('useWebBLE Hook', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        const context = useWebBLE();
        return <div>{context ? 'Has Context' : 'No Context'}</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useWebBLE must be used within a WebBLEProvider');

      consoleSpy.mockRestore();
    });

    it('should provide all context methods', () => {
      const TestComponent = () => {
        const context = useWebBLE();
        const hasAllMethods = 
          context.requestDevice !== undefined &&
          context.getDevices !== undefined &&
          context.requestLEScan !== undefined;
        
        return <div>{hasAllMethods ? 'All Methods Available' : 'Missing Methods'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      expect(screen.getByText('All Methods Available')).toBeInTheDocument();
    });
  });

  describe('Provider Methods', () => {
    it('should handle requestDevice', async () => {
      const mockDevice = new (global as any).BluetoothDevice();
      
      // Mock the WebBLEClient instance
      const mockRequestDevice = jest.fn().mockResolvedValue(mockDevice);
      MockedWebBLEClient.prototype.requestDevice = mockRequestDevice;

      const TestComponent = () => {
        const { requestDevice, devices } = useWebBLE();
        
        React.useEffect(() => {
          requestDevice({ acceptAllDevices: true });
        }, [requestDevice]);
        
        return <div>Devices: {devices.length}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Devices: 1')).toBeInTheDocument();
      });

      expect(mockRequestDevice).toHaveBeenCalledWith({ acceptAllDevices: true });
    });

    it('should handle getDevices', async () => {
      const mockDevices = [
        new (global as any).BluetoothDevice(),
        new (global as any).BluetoothDevice()
      ];
      
      // Mock the WebBLEClient instance
      const mockGetDevices = jest.fn().mockResolvedValue(mockDevices);
      (WebBLEClient as jest.MockedClass<typeof WebBLEClient>).prototype.getDevices = mockGetDevices;

      const TestComponent = () => {
        const { getDevices, devices } = useWebBLE();
        
        React.useEffect(() => {
          getDevices();
        }, [getDevices]);
        
        return <div>Devices: {devices.length}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Devices: 2')).toBeInTheDocument();
      });
    });

    it('should handle requestLEScan', async () => {
      const mockScan = { active: true, stop: jest.fn() };
      
      // Mock the WebBLEClient instance
      const mockRequestLEScan = jest.fn().mockResolvedValue(mockScan);
      MockedWebBLEClient.prototype.requestLEScan = mockRequestLEScan;

      const TestComponent = () => {
        const { requestLEScan, isScanning } = useWebBLE();
        
        React.useEffect(() => {
          requestLEScan({ acceptAllAdvertisements: true });
        }, [requestLEScan]);
        
        return <div>{isScanning ? 'Scanning' : 'Not Scanning'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Scanning')).toBeInTheDocument();
      });

      expect(mockRequestLEScan).toHaveBeenCalledWith({ acceptAllAdvertisements: true });
    });

    it('should handle scan stop', async () => {
      jest.useFakeTimers();
      const mockStop = jest.fn();
      const mockScan = { active: true, stop: mockStop };
      
      // Mock the WebBLEClient method
      MockedWebBLEClient.prototype.requestLEScan = jest.fn().mockResolvedValue(mockScan);

      const TestComponent = () => {
        const { requestLEScan, stopScan, isScanning } = useWebBLE();
        
        React.useEffect(() => {
          const startScan = async () => {
            await requestLEScan({ acceptAllAdvertisements: true });
            setTimeout(() => stopScan(), 50);
          };
          startScan();
        }, [requestLEScan, stopScan]);
        
        return <div>{isScanning ? 'Scanning' : 'Not Scanning'}</div>;
      };

      render(
        <WebBLEProvider>
          <TestComponent />
        </WebBLEProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Scanning')).toBeInTheDocument();
      });

      // Advance timers to trigger the stopScan
      act(() => {
        jest.advanceTimersByTime(50);
      });

      await waitFor(() => {
        expect(screen.getByText('Not Scanning')).toBeInTheDocument();
      });

      expect(mockStop).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});