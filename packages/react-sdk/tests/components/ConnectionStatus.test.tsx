import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectionStatus } from '../../src/components/ConnectionStatus';
import { useDevice } from '../../src/hooks/useDevice';
import type { UseDeviceReturn } from '../../src/types';

jest.mock('../../src/hooks/useDevice');

const mockUseDevice = useDevice as jest.MockedFunction<typeof useDevice>;

function mockDeviceReturn(overrides: Partial<UseDeviceReturn> = {}): UseDeviceReturn {
  return {
    device: null,
    connectionState: 'disconnected',
    isConnected: false,
    isConnecting: false,
    services: [],
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    autoReconnect: false,
    setAutoReconnect: jest.fn(),
    reconnectAttempt: 0,
    ...overrides,
  };
}

describe('ConnectionStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection states', () => {
    it('should display connected state with green indicator', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connected' }));

      const { container } = render(<ConnectionStatus />);

      expect(screen.getByText('connected')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(0, 128, 0)' });
    });

    it('should display connecting state with orange indicator', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connecting' }));

      const { container } = render(<ConnectionStatus />);

      expect(screen.getByText('connecting')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(255, 165, 0)' });
    });

    it('should display disconnecting state with orange indicator', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'disconnecting' }));

      const { container } = render(<ConnectionStatus />);

      expect(screen.getByText('disconnecting')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(255, 165, 0)' });
    });

    it('should display disconnected state with red indicator', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'disconnected' }));

      const { container } = render(<ConnectionStatus />);

      expect(screen.getByText('disconnected')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
    });

    it('should display unknown state with gray indicator', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'unknown' as any }));

      const { container } = render(<ConnectionStatus />);

      expect(screen.getByText('unknown')).toBeInTheDocument();
      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(128, 128, 128)' });
    });
  });

  describe('Props handling', () => {
    it('should pass device to useDevice hook', () => {
      const mockDevice = { id: 'test-device-123', name: 'Test Device', connected: false } as any;
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connected' }));

      render(<ConnectionStatus device={mockDevice} />);

      expect(mockUseDevice).toHaveBeenCalledWith(mockDevice);
    });

    it('should default device to null', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn());

      render(<ConnectionStatus />);

      expect(mockUseDevice).toHaveBeenCalledWith(null);
    });

    it('should apply custom className', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connected' }));

      const { container } = render(<ConnectionStatus className="custom-status" />);

      expect(container.querySelector('.custom-status')).toBeInTheDocument();
    });

    it('should handle both device and className', () => {
      const mockDevice = { id: 'test-device-456', name: 'Test Device', connected: false } as any;
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connecting' }));

      const { container } = render(
        <ConnectionStatus device={mockDevice} className="my-status" />
      );

      expect(mockUseDevice).toHaveBeenCalledWith(mockDevice);
      expect(container.querySelector('.my-status')).toBeInTheDocument();
      expect(screen.getByText('connecting')).toBeInTheDocument();
    });
  });

  describe('Visual styling', () => {
    it('should have proper flex container styling', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connected' }));

      const { container } = render(<ConnectionStatus />);
      const wrapper = container.firstChild as HTMLElement;

      expect(wrapper).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
    });

    it('should have circular indicator with correct size', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connected' }));

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
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: null as any }));

      const { container } = render(<ConnectionStatus />);

      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(128, 128, 128)' });
    });

    it('should handle undefined connectionState', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: undefined as any }));

      const { container } = render(<ConnectionStatus />);

      const indicator = container.querySelector('span');
      expect(indicator).toHaveStyle({ backgroundColor: 'rgb(128, 128, 128)' });
    });
  });

  describe('Re-rendering behavior', () => {
    it('should update when connectionState changes', () => {
      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'disconnected' }));

      const { rerender } = render(<ConnectionStatus />);
      expect(screen.getByText('disconnected')).toBeInTheDocument();

      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connecting' }));
      rerender(<ConnectionStatus />);
      expect(screen.getByText('connecting')).toBeInTheDocument();

      mockUseDevice.mockReturnValue(mockDeviceReturn({ connectionState: 'connected' }));
      rerender(<ConnectionStatus />);
      expect(screen.getByText('connected')).toBeInTheDocument();
    });
  });
});
