import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HeartRateMonitor } from './HeartRateMonitor';
import { useBluetooth, useDevice, useProfile } from '@ios-web-bluetooth/react';

jest.mock('@ios-web-bluetooth/react', () => ({
  useBluetooth: jest.fn(),
  useDevice: jest.fn(),
  useProfile: jest.fn(),
}));

jest.mock('@ios-web-bluetooth/profiles', () => ({
  HeartRateProfile: class HeartRateProfile {},
}));

describe('HeartRateMonitor', () => {
  const mockRequestDevice = jest.fn();
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();
  const mockOnHeartRate = jest.fn();

  const mockedUseBluetooth = useBluetooth as jest.Mock;
  const mockedUseDevice = useDevice as jest.Mock;
  const mockedUseProfile = useProfile as jest.Mock;

  const renderMonitor = () => render(<HeartRateMonitor />);

  beforeEach(() => {
    jest.clearAllMocks();

    mockedUseBluetooth.mockReturnValue({
      isAvailable: true,
      isExtensionInstalled: true,
      requestDevice: mockRequestDevice
    });

    mockedUseDevice.mockReturnValue({
      device: null,
      connectionState: 'disconnected',
      isConnected: false,
      isConnecting: false,
      connect: mockConnect,
      disconnect: mockDisconnect,
      error: null,
    });

    mockedUseProfile.mockReturnValue({
      profile: null,
      connect: jest.fn(),
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should render connect button when not connected', () => {
      renderMonitor();

      expect(screen.getByText('Connect to Heart Rate Monitor')).toBeInTheDocument();
      expect(screen.queryByText(/BPM/)).not.toBeInTheDocument();
    });

    it('should show installation prompt if extension not installed', () => {
      mockedUseBluetooth.mockReturnValue({
        isAvailable: true,
        isExtensionInstalled: false,
        requestDevice: mockRequestDevice
      });

      renderMonitor();

      expect(screen.getByText(/WebBLE extension not installed/i)).toBeInTheDocument();
    });

    it('should show not available message if Bluetooth not available', () => {
      mockedUseBluetooth.mockReturnValue({
        isAvailable: false,
        isExtensionInstalled: false,
        requestDevice: mockRequestDevice
      });

      renderMonitor();

      expect(screen.getByText(/Bluetooth not available/i)).toBeInTheDocument();
    });
  });

  describe('Device Connection', () => {
    it('should request device when connect button is clicked', async () => {
      const mockDevice = { id: 'test-device-123', name: 'HR Monitor' };
      mockRequestDevice.mockResolvedValue(mockDevice);

      renderMonitor();

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
      mockedUseDevice.mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        connectionState: 'connecting',
        isConnected: false,
        isConnecting: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
      });

      renderMonitor();

      expect(screen.getByText(/Connecting.../i)).toBeInTheDocument();
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockRequestDevice.mockRejectedValue(error);

      renderMonitor();

      const connectButton = screen.getByText('Connect to Heart Rate Monitor');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Heart Rate Display', () => {
    it('should display heart rate when receiving profile updates', async () => {
      mockedUseDevice.mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
      });

      mockedUseProfile.mockReturnValue({
        profile: { onHeartRate: mockOnHeartRate },
        connect: jest.fn(),
        error: null,
      });

      renderMonitor();

      const callback = mockOnHeartRate.mock.calls[0][0];
      act(() => {
        callback({ bpm: 72, contact: true, energyExpended: null, rrIntervals: [] });
      });

      expect(await screen.findByText('72')).toBeInTheDocument();
      expect(screen.getByText('BPM')).toBeInTheDocument();
    });

    it('should show contact detected status', async () => {
      mockedUseDevice.mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
      });

      mockedUseProfile.mockReturnValue({
        profile: { onHeartRate: mockOnHeartRate },
        connect: jest.fn(),
        error: null,
      });

      renderMonitor();

      const callback = mockOnHeartRate.mock.calls[0][0];
      act(() => {
        callback({ bpm: 65, contact: true, energyExpended: null, rrIntervals: [] });
      });

      expect(await screen.findByText('65')).toBeInTheDocument();
      expect(screen.getByTestId('contact-indicator')).toHaveClass('contact-detected');
    });

    it('should display heart rate history graph', async () => {
      mockedUseDevice.mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
      });

      mockedUseProfile.mockReturnValue({
        profile: { onHeartRate: mockOnHeartRate },
        connect: jest.fn(),
        error: null,
      });

      renderMonitor();

      const callback = mockOnHeartRate.mock.calls[0][0];
      act(() => {
        callback({ bpm: 70, contact: true, energyExpended: null, rrIntervals: [] });
        callback({ bpm: 72, contact: true, energyExpended: null, rrIntervals: [] });
        callback({ bpm: 75, contact: true, energyExpended: null, rrIntervals: [] });
        callback({ bpm: 73, contact: true, energyExpended: null, rrIntervals: [] });
      });

      expect(await screen.findByTestId('heart-rate-graph')).toBeInTheDocument();
      expect(screen.getByText('Min: 70')).toBeInTheDocument();
      expect(screen.getByText('Max: 75')).toBeInTheDocument();
      expect(screen.getByText('Avg: 72.5')).toBeInTheDocument();
    });
  });

  describe('Device Controls', () => {
    beforeEach(() => {
      mockedUseDevice.mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
      });

      mockedUseProfile.mockReturnValue({
        profile: { onHeartRate: mockOnHeartRate },
        connect: jest.fn(),
        error: null,
      });
    });

    it('should disconnect when disconnect button is clicked', () => {
      renderMonitor();

      const disconnectButton = screen.getByText('Disconnect');
      fireEvent.click(disconnectButton);

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should start/stop recording heart rate data', () => {
      renderMonitor();

      const recordButton = screen.getByText('Start Recording');
      fireEvent.click(recordButton);

      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Stop Recording'));
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    it('should export recorded data as CSV', async () => {
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

      mockedUseProfile.mockReturnValue({
        profile: { onHeartRate: mockOnHeartRate },
        connect: jest.fn(),
        error: null,
      });

      renderMonitor();

      fireEvent.click(screen.getByText('Start Recording'));
      const callback = mockOnHeartRate.mock.calls[0][0];

      act(() => {
        callback({ bpm: 70, contact: true, energyExpended: null, rrIntervals: [] });
        callback({ bpm: 72, contact: true, energyExpended: null, rrIntervals: [] });
      });

      const exportButton = screen.getByText('Export Data');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalled();
      });

      clickSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderMonitor();

      expect(screen.getByRole('button', { name: /Connect to Heart Rate Monitor/i })).toBeInTheDocument();
    });

    it('should announce heart rate changes to screen readers', async () => {
      mockedUseDevice.mockReturnValue({
        device: { id: 'test-device-123', name: 'HR Monitor' },
        connectionState: 'connected',
        isConnected: true,
        isConnecting: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
      });

      mockedUseProfile.mockReturnValue({
        profile: { onHeartRate: mockOnHeartRate },
        connect: jest.fn(),
        error: null,
      });

      renderMonitor();

      const callback = mockOnHeartRate.mock.calls[0][0];
      act(() => {
        callback({ bpm: 80, contact: true, energyExpended: null, rrIntervals: [] });
      });

      const announcement = await screen.findByRole('status');
      expect(announcement).toHaveTextContent('Heart rate: 80 beats per minute');
    });
  });
});
