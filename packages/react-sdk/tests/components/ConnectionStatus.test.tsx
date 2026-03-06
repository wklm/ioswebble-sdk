import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionStatus } from '../../src/components/ConnectionStatus';
import { useConnection } from '../../src/hooks/useConnection';

// Mock the useConnection hook
jest.mock('../../src/hooks/useConnection');

const mockUseConnection = useConnection as jest.MockedFunction<typeof useConnection>;

describe('ConnectionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection states', () => {
    it('should display connected state with green indicator', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      expect(screen.getByText('connected')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'green' });
    });

    it('should display connecting state with orange indicator', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connecting',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      expect(screen.getByText('connecting')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'orange' });
    });

    it('should display disconnecting state with orange indicator', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'disconnecting',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      expect(screen.getByText('disconnecting')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'orange' });
    });

    it('should display disconnected state with red indicator', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'disconnected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      expect(screen.getByText('disconnected')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'red' });
    });

    it('should display unknown state with gray indicator', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'unknown' as any,
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      expect(screen.getByText('unknown')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'gray' });
    });
  });

  describe('RSSI display', () => {
    it('should display RSSI value when available', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: -65,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('(-65 dBm)')).toBeInTheDocument();
    });

    it('should not display RSSI when null', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.queryByText(/dBm/)).not.toBeInTheDocument();
    });

    it('should display positive RSSI value', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: 0,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('(0 dBm)')).toBeInTheDocument();
    });

    it('should display strong signal RSSI', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: -40,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('(-40 dBm)')).toBeInTheDocument();
    });

    it('should display weak signal RSSI', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: -90,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('(-90 dBm)')).toBeInTheDocument();
    });
  });

  describe('Props handling', () => {
    it('should accept deviceId prop', () => {
      const mockDeviceId = 'test-device-123';
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus deviceId={mockDeviceId} />);
      
      expect(mockUseConnection).toHaveBeenCalledWith(mockDeviceId);
    });

    it('should apply custom className', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus className="custom-status" />);
      
      expect(container.querySelector('.custom-status')).toBeInTheDocument();
    });

    it('should handle undefined deviceId', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'disconnected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(mockUseConnection).toHaveBeenCalledWith(undefined);
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });

    it('should handle both deviceId and className', () => {
      const mockDeviceId = 'test-device-456';
      mockUseConnection.mockReturnValue({
        connectionState: 'connecting',
        rssi: -70,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(
        <ConnectionStatus deviceId={mockDeviceId} className="my-status" />
      );
      
      expect(mockUseConnection).toHaveBeenCalledWith(mockDeviceId);
      expect(container.querySelector('.my-status')).toBeInTheDocument();
      expect(screen.getByText('connecting')).toBeInTheDocument();
      expect(screen.getByText('(-70 dBm)')).toBeInTheDocument();
    });
  });

  describe('Visual styling', () => {
    it('should have proper flex container styling', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      const wrapper = container.firstChild as HTMLElement;
      
      expect(wrapper).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
    });

    it('should have circular indicator with correct size', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      const indicator = container.querySelector('span[style*="width"]') as HTMLElement;
      
      expect(indicator).toHaveStyle({
        width: '10px',
        height: '10px',
        borderRadius: '50%'
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle null connectionState gracefully', () => {
      mockUseConnection.mockReturnValue({
        connectionState: null as any,
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'gray' });
    });

    it('should handle undefined connectionState', () => {
      mockUseConnection.mockReturnValue({
        connectionState: undefined as any,
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      const { container } = render(<ConnectionStatus />);
      
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'gray' });
    });

    it('should handle extreme RSSI values', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: -127,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('(-127 dBm)')).toBeInTheDocument();
    });

    it('should handle zero RSSI', () => {
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: 0,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });

      render(<ConnectionStatus />);
      
      expect(screen.getByText('(0 dBm)')).toBeInTheDocument();
    });
  });

  describe('Re-rendering behavior', () => {
    it('should update when connectionState changes', () => {
      const { rerender } = render(<ConnectionStatus />);
      
      // Initial state
      mockUseConnection.mockReturnValue({
        connectionState: 'disconnected',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });
      
      rerender(<ConnectionStatus />);
      expect(screen.getByText('disconnected')).toBeInTheDocument();
      
      // Change to connecting
      mockUseConnection.mockReturnValue({
        connectionState: 'connecting',
        rssi: null,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });
      
      rerender(<ConnectionStatus />);
      expect(screen.getByText('connecting')).toBeInTheDocument();
      
      // Change to connected with RSSI
      mockUseConnection.mockReturnValue({
        connectionState: 'connected',
        rssi: -55,
        connectionPriority: 'balanced',
        connect: jest.fn(),
        disconnect: jest.fn(),
        requestConnectionPriority: jest.fn(),
        getConnectionParameters: jest.fn(),
        error: null
      });
      
      rerender(<ConnectionStatus />);
      expect(screen.getByText('connected')).toBeInTheDocument();
      expect(screen.getByText('(-55 dBm)')).toBeInTheDocument();
    });
  });
});