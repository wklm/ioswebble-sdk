/**
 * Heart Rate Monitor Example - Test Suite
 * 
 * Tests for the Heart Rate Monitor example application
 * Following TDD principles - tests written before implementation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeartRateMonitor } from './HeartRateMonitor';
import { WebBLE } from '@wklm/react';

// Mock the WebBLE hooks
jest.mock('@wklm/react', () => ({
  WebBLE: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useBluetooth: jest.fn(),
    useDevice: jest.fn(),
    useNotifications: jest.fn(),
    useConnection: jest.fn()
  }
}));

describe('HeartRateMonitor', () => {
  const mockRequestDevice = jest.fn();
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();
  const mockStartNotifications = jest.fn();
  const mockStopNotifications = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    (WebBLE.useBluetooth as jest.Mock).mockReturnValue({
      isAvailable: true,
      isExtensionInstalled: true,
      requestDevice: mockRequestDevice
    });

    (WebBLE.useDevice as jest.Mock).mockReturnValue({
      device: null,
      isConnected: false,
      connect: mockConnect,
      disconnect: mockDisconnect,
      connectionState: 'disconnected'
    });

    (WebBLE.useNotifications as jest.Mock).mockReturnValue({
      value: null,
      isSubscribed: false,
      subscribe: mockStartNotifications,
      unsubscribe: mockStopNotifications,
      history: []
    });

    (WebBLE.useConnection as jest.Mock).mockReturnValue({
      connectionQuality: 'good',
      reconnect: jest.fn()
    });
  });

  describe('Initial State', () => {
    it('should render connect button when not connected', () => {
      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByText('Connect to Heart Rate Monitor')).toBeInTheDocument();
      expect(screen.queryByText(/BPM/)).not.toBeInTheDocument();
    });

    it('should show installation prompt if extension not installed', () => {
      (WebBLE.useBluetooth as jest.Mock).mockReturnValue({
        isAvailable: true,
        isExtensionInstalled: false,
        requestDevice: mockRequestDevice
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByText(/WebBLE extension not installed/i)).toBeInTheDocument();
    });

    it('should show not available message if Bluetooth not available', () => {
      (WebBLE.useBluetooth as jest.Mock).mockReturnValue({
        isAvailable: false,
        isExtensionInstalled: false,
        requestDevice: mockRequestDevice
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByText(/Bluetooth not available/i)).toBeInTheDocument();
    });
  });

  describe('Device Connection', () => {
    it('should request device when connect button is clicked', async () => {
      const mockDevice = { id: 'test-device-123', name: 'HR Monitor' };
      mockRequestDevice.mockResolvedValue(mockDevice);

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const connectButton = screen.getByText('Connect to Heart Rate Monitor');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(mockRequestDevice).toHaveBeenCalledWith({
          filters: [{ services: ['heart_rate'] }],
          optionalServices: ['battery_service']
        });
      });
    });

    it('should show connecting state while connecting', async () => {
      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connecting'
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockRequestDevice.mockRejectedValue(error);

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const connectButton = screen.getByText('Connect to Heart Rate Monitor');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Heart Rate Display', () => {
    it('should display heart rate when receiving notifications', () => {
      // Create a DataView with heart rate data
      const heartRateData = new ArrayBuffer(2);
      const view = new DataView(heartRateData);
      view.setUint8(0, 0x00); // Flags
      view.setUint8(1, 72); // Heart rate value

      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });

      (WebBLE.useNotifications as jest.Mock).mockReturnValue({
        value: view,
        isSubscribed: true,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        history: []
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByText('72')).toBeInTheDocument();
      expect(screen.getByText('BPM')).toBeInTheDocument();
    });

    it('should show contact detected status', () => {
      // Create a DataView with contact detected flag
      const heartRateData = new ArrayBuffer(2);
      const view = new DataView(heartRateData);
      view.setUint8(0, 0x02); // Flags with contact detected
      view.setUint8(1, 65); // Heart rate value

      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });

      (WebBLE.useNotifications as jest.Mock).mockReturnValue({
        value: view,
        isSubscribed: true,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        history: []
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByText('65')).toBeInTheDocument();
      expect(screen.getByTestId('contact-indicator')).toHaveClass('contact-detected');
    });

    it('should display heart rate history graph', () => {
      const history = [
        { timestamp: Date.now() - 3000, value: 70 },
        { timestamp: Date.now() - 2000, value: 72 },
        { timestamp: Date.now() - 1000, value: 75 },
        { timestamp: Date.now(), value: 73 }
      ];

      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });

      (WebBLE.useNotifications as jest.Mock).mockReturnValue({
        value: null,
        isSubscribed: true,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        history
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByTestId('heart-rate-graph')).toBeInTheDocument();
      expect(screen.getByText('Min: 70')).toBeInTheDocument();
      expect(screen.getByText('Max: 75')).toBeInTheDocument();
      expect(screen.getByText('Avg: 72.5')).toBeInTheDocument();
    });
  });

  describe('Device Controls', () => {
    beforeEach(() => {
      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });
    });

    it('should disconnect when disconnect button is clicked', () => {
      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should start/stop recording heart rate data', () => {
      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const recordButton = screen.getByText('Start Recording');
      fireEvent.click(recordButton);

      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Stop Recording'));
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should export recorded data as CSV', () => {
      const history = [
        { timestamp: 1000, value: 70 },
        { timestamp: 2000, value: 72 }
      ];

      (WebBLE.useNotifications as jest.Mock).mockReturnValue({
        value: null,
        isSubscribed: true,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        history
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      // Check if download was triggered
      expect(screen.getByText(/Data exported/i)).toBeInTheDocument();
    });
  });

  describe('Connection Quality', () => {
    it('should display connection quality indicator', () => {
      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });

      (WebBLE.useConnection as jest.Mock).mockReturnValue({
        connectionQuality: 'excellent',
        reconnect: jest.fn()
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const qualityIndicator = screen.getByTestId('connection-quality');
      expect(qualityIndicator).toHaveClass('quality-excellent');
      expect(screen.getByText(/Excellent/i)).toBeInTheDocument();
    });

    it('should show reconnect button on poor connection', () => {
      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });

      const mockReconnect = jest.fn();
      (WebBLE.useConnection as jest.Mock).mockReturnValue({
        connectionQuality: 'poor',
        reconnect: mockReconnect
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const reconnectButton = screen.getByText('Improve Connection');
      fireEvent.click(reconnectButton);

      expect(mockReconnect).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      expect(screen.getByRole('button', { name: /Connect to Heart Rate Monitor/i })).toBeInTheDocument();
    });

    it('should announce heart rate changes to screen readers', () => {
      const heartRateData = new ArrayBuffer(2);
      const view = new DataView(heartRateData);
      view.setUint8(0, 0x00);
      view.setUint8(1, 80);

      (WebBLE.useDevice as jest.Mock).mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        connectionState: 'connected'
      });

      (WebBLE.useNotifications as jest.Mock).mockReturnValue({
        value: view,
        isSubscribed: true,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        history: []
      });

      render(
        <WebBLE.Provider>
          <HeartRateMonitor />
        </WebBLE.Provider>
      );

      const announcement = screen.getByRole('status');
      expect(announcement).toHaveTextContent('Heart rate: 80 beats per minute');
    });
  });
});