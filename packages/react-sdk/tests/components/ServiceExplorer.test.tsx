import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ServiceExplorer } from '../../src/components/ServiceExplorer';
import { useDevice } from '../../src/hooks/useDevice';
import { useCharacteristic } from '../../src/hooks/useCharacteristic';

// Mock the hooks
jest.mock('../../src/hooks/useDevice');
jest.mock('../../src/hooks/useCharacteristic');

const mockUseDevice = useDevice as jest.MockedFunction<typeof useDevice>;
const mockUseCharacteristic = useCharacteristic as jest.MockedFunction<typeof useCharacteristic>;

describe('ServiceExplorer', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockDisconnect = jest.fn().mockResolvedValue(undefined);
  const mockRead = jest.fn().mockResolvedValue(undefined);
  const mockWrite = jest.fn().mockResolvedValue(undefined);
  const mockStartNotifications = jest.fn().mockResolvedValue(undefined);
  const mockStopNotifications = jest.fn().mockResolvedValue(undefined);

  const mockDevice = {
    id: 'test-device-1',
    name: 'Test Device'
  };

  // Create proper BluetoothRemoteGATTCharacteristic-like mock objects
  const createMockCharacteristic = (uuid: string, properties: any) => ({
    uuid,
    properties,
    service: null, // Will be set when returned from getCharacteristics
    readValue: jest.fn(),
    writeValue: jest.fn(),
    writeValueWithoutResponse: jest.fn(),
    startNotifications: jest.fn(),
    stopNotifications: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    getDescriptor: jest.fn(),
    getDescriptors: jest.fn()
  });

  const mockCharacteristics = {
    heartRate: [
      createMockCharacteristic('00002a37-0000-1000-8000-00805f9b34fb', { // Heart Rate Measurement
        read: true,
        write: false,
        writeWithoutResponse: false,
        notify: true,
        indicate: false,
        broadcast: false,
        authenticatedSignedWrites: false,
        reliableWrite: false,
        writableAuxiliaries: false
      }),
      createMockCharacteristic('00002a38-0000-1000-8000-00805f9b34fb', { // Body Sensor Location
        read: true,
        write: true,
        writeWithoutResponse: false,
        notify: false,
        indicate: false,
        broadcast: false,
        authenticatedSignedWrites: false,
        reliableWrite: false,
        writableAuxiliaries: false
      })
    ],
    battery: [
      createMockCharacteristic('00002a19-0000-1000-8000-00805f9b34fb', { // Battery Level
        read: true,
        write: false,
        writeWithoutResponse: false,
        notify: true,
        indicate: false,
        broadcast: false,
        authenticatedSignedWrites: false,
        reliableWrite: false,
        writableAuxiliaries: false
      })
    ]
  };

  const mockServices = [
    {
      uuid: '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
      isPrimary: true,
      getCharacteristics: jest.fn().mockImplementation(async function() {
        // Set the service reference on each characteristic
        const chars = mockCharacteristics.heartRate.map(c => ({ ...c, service: this }));
        return chars;
      })
    },
    {
      uuid: '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
      isPrimary: true,
      getCharacteristics: jest.fn().mockImplementation(async function() {
        // Set the service reference on each characteristic
        const chars = mockCharacteristics.battery.map(c => ({ ...c, service: this }));
        return chars;
      })
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseDevice.mockReturnValue({
      device: mockDevice,
      services: [],
      connectionState: 'disconnected',
      connect: mockConnect,
      disconnect: mockDisconnect,
      error: null,
      forget: jest.fn(),
      watchAdvertisements: jest.fn(),
      unwatchAdvertisements: jest.fn()
    });

    mockUseCharacteristic.mockImplementation((characteristic, service, device) => {
      return {
        characteristic,
        value: null,
        properties: characteristic?.properties || null,
        read: mockRead,
        write: mockWrite,
        writeWithoutResponse: jest.fn().mockResolvedValue(undefined),
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        isNotifying: false,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: null
      };
    });
  });

  describe('Rendering states', () => {
    it('should show no device selected when no deviceId provided', () => {
      mockUseDevice.mockReturnValue({
        device: null,
        services: [],
        connectionState: 'disconnected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer />);
      expect(screen.getByText('No device selected')).toBeInTheDocument();
    });

    it('should show device not found when deviceId provided but device not found', () => {
      mockUseDevice.mockReturnValue({
        device: null,
        services: [],
        connectionState: 'disconnected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="non-existent" />);
      expect(screen.getByText('Device not found')).toBeInTheDocument();
    });

    it('should render device info when device is found', () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('Test Device')).toBeInTheDocument();
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<ServiceExplorer deviceId="test-device-1" className="custom-explorer" />);
      expect(container.querySelector('.service-explorer.custom-explorer')).toBeInTheDocument();
    });
  });

  describe('Connection management', () => {
    it('should show connect button when disconnected', () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('Connect to Device')).toBeInTheDocument();
    });

    it('should call connect when connect button clicked', () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByText('Connect to Device'));
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should show disconnect button when connected', () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('should call disconnect when disconnect button clicked', () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByText('Disconnect'));
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should show connecting state', () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [],
        connectionState: 'connecting',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should auto-connect when autoConnect is true', () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [],
        connectionState: 'disconnected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" autoConnect={true} />);
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('Service display', () => {
    beforeEach(() => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });
    });

    it('should display services when connected', () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('Found 2 service(s)')).toBeInTheDocument();
      expect(screen.getByText('Heart Rate')).toBeInTheDocument();
      expect(screen.getByText('Battery Service')).toBeInTheDocument();
    });

    it('should show service type (Primary/Secondary)', () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      const primaryElements = screen.getAllByText('Primary');
      expect(primaryElements).toHaveLength(2);
    });

    it('should toggle service expansion on click', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      
      const heartRateButton = screen.getByLabelText('Expand Heart Rate');
      fireEvent.click(heartRateButton);
      
      expect(screen.getByLabelText('Collapse Heart Rate')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(screen.getByText('Heart Rate Measurement')).toBeInTheDocument();
      });
    });

    it('should expand all services when expandedByDefault is true', async () => {
      render(<ServiceExplorer deviceId="test-device-1" expandedByDefault={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Heart Rate Measurement')).toBeInTheDocument();
        expect(screen.getByText('Body Sensor Location')).toBeInTheDocument();
        expect(screen.getByText('Battery Level')).toBeInTheDocument();
      });
    });

    it('should show discovering services message when connected but no services', () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [],
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('Discovering services...')).toBeInTheDocument();
    });
  });

  describe('Characteristic display', () => {
    beforeEach(() => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });
    });

    it('should display characteristic properties', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      
      // Expand Heart Rate service
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      // Wait for characteristics to load
      await waitFor(() => {
        // Check for property indicators
        const readIndicators = screen.getAllByText('R');
        const notifyIndicators = screen.getAllByText('N');
        const writeIndicators = screen.getAllByText('W');
        
        expect(readIndicators.length).toBeGreaterThan(0);
        expect(notifyIndicators.length).toBeGreaterThan(0);
        expect(writeIndicators.length).toBeGreaterThan(0);
      });
    });

    it('should call onCharacteristicSelect when characteristic is clicked', async () => {
      const onSelect = jest.fn();
      render(<ServiceExplorer deviceId="test-device-1" onCharacteristicSelect={onSelect} />);
      
      // Expand Heart Rate service
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      // Wait for characteristics to load
      await waitFor(() => {
        expect(screen.getByLabelText('Select characteristic Heart Rate Measurement')).toBeInTheDocument();
      });
      
      // Click on characteristic
      fireEvent.click(screen.getByLabelText('Select characteristic Heart Rate Measurement'));
      
      expect(onSelect).toHaveBeenCalledWith('00002a37-0000-1000-8000-00805f9b34fb');
    });
  });

  describe('Characteristic operations', () => {
    beforeEach(() => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });
    });

    it('should show read button for readable characteristics', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        const readButtons = screen.getAllByText('Read');
        expect(readButtons.length).toBeGreaterThan(0);
      });
    });

    it('should call read when read button is clicked', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      
      // Wait for services to render
      await waitFor(() => {
        expect(screen.getByLabelText('Expand Heart Rate')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      // Wait for characteristics to load
      await waitFor(() => {
        expect(screen.getByText('Heart Rate Measurement')).toBeInTheDocument();
      });
      
      // Now look for the Read buttons (multiple characteristics have read capability)
      await waitFor(() => {
        const readButtons = screen.getAllByText('Read');
        expect(readButtons.length).toBeGreaterThan(0);
      });
      
      const readButtons = screen.getAllByText('Read');
      fireEvent.click(readButtons[0]);
      
      await waitFor(() => expect(mockRead).toHaveBeenCalled());
    });

    it('should display characteristic value after reading', async () => {
      const mockValue = new DataView(new ArrayBuffer(4));
      mockValue.setUint8(0, 0x48); // 'H'
      mockValue.setUint8(1, 0x69); // 'i'
      mockValue.setUint8(2, 0x21); // '!'
      mockValue.setUint8(3, 0x00);

      mockUseCharacteristic.mockImplementation((characteristic, service, device) => ({
        characteristic,
        value: mockValue,
        properties: characteristic?.properties || null,
        read: mockRead,
        write: mockWrite,
        writeWithoutResponse: jest.fn(),
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        isNotifying: false,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: null
      }));

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        const readButtons = screen.getAllByText('Read');
        expect(readButtons.length).toBeGreaterThan(0);
      });
      
      const readButtons = screen.getAllByText('Read');
      fireEvent.click(readButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Value (4 bytes):')).toBeInTheDocument();
        expect(screen.getByText('Hex: 48 69 21 00')).toBeInTheDocument();
        expect(screen.getByText('Text: Hi!.')).toBeInTheDocument();
      });
    });

    it('should show write controls for writable characteristics', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter value to write')).toBeInTheDocument();
        const writeButtons = screen.getAllByText('Write');
        expect(writeButtons.length).toBeGreaterThan(0);
      });
    });

    it('should call write with encoded data when write button is clicked', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter value to write')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Enter value to write');
      fireEvent.change(input, { target: { value: 'Hello' } });
      
      const writeButtons = screen.getAllByText('Write');
      fireEvent.click(writeButtons[0]);
      
      await waitFor(() => {
        expect(mockWrite).toHaveBeenCalled();
        const callArg = mockWrite.mock.calls[0][0];
        // Check that the argument is array-like with the correct bytes
        expect(callArg).toBeDefined();
        expect(callArg.length).toBe(5); // 'Hello' is 5 bytes
      });
    });

    it('should show notification controls for notifiable characteristics', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByText('Start Notify')).toBeInTheDocument();
      });
    });

    it('should toggle notifications when notify button is clicked', async () => {
      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByText('Start Notify')).toBeInTheDocument();
      });
      
      const notifyButton = screen.getByText('Start Notify');
      fireEvent.click(notifyButton);
      
      await waitFor(() => expect(mockStartNotifications).toHaveBeenCalled());
    });

    it('should show stop notify when notifications are active', async () => {
      mockUseCharacteristic.mockImplementation((characteristic, service, device) => ({
        characteristic,
        value: null,
        properties: characteristic?.properties || null,
        read: mockRead,
        write: mockWrite,
        writeWithoutResponse: jest.fn(),
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        isNotifying: true,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: null
      }));

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByText('Stop Notify')).toBeInTheDocument();
      });
    });

    it('should call stopNotifications when stop notify is clicked', async () => {
      mockUseCharacteristic.mockImplementation((characteristic, service, device) => ({
        characteristic,
        value: null,
        properties: characteristic?.properties || null,
        read: mockRead,
        write: mockWrite,
        writeWithoutResponse: jest.fn(),
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        isNotifying: true,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: null
      }));

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByText('Stop Notify')).toBeInTheDocument();
      });
      
      const stopButton = screen.getByText('Stop Notify');
      fireEvent.click(stopButton);
      
      await waitFor(() => expect(mockStopNotifications).toHaveBeenCalled());
    });
  });

  describe('Error handling', () => {
    it('should display device error', () => {
      const error = new Error('Connection failed');
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [],
        connectionState: 'disconnected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Connection failed');
    });

    it('should display characteristic error', async () => {
      const charError = new Error('Read failed');
      mockUseCharacteristic.mockImplementation((characteristic, service, device) => ({
        characteristic,
        value: null,
        properties: characteristic?.properties || null,
        read: mockRead,
        write: mockWrite,
        writeWithoutResponse: jest.fn(),
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        isNotifying: false,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: charError
      }));

      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      // Wait for characteristic to be rendered
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const errorAlert = alerts.find(alert => alert.textContent?.includes('Read failed'));
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('Empty states', () => {
    it('should show message when disconnected without autoConnect', () => {
      render(<ServiceExplorer deviceId="test-device-1" autoConnect={false} />);
      expect(screen.getByText('Connect to the device to explore its services and characteristics.')).toBeInTheDocument();
    });

    it('should handle null value gracefully', async () => {
      mockUseCharacteristic.mockImplementation((characteristic, service, device) => ({
        characteristic,
        value: null,
        properties: characteristic?.properties || null,
        read: mockRead,
        write: mockWrite,
        writeWithoutResponse: jest.fn(),
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        isNotifying: false,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: null
      }));

      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        const readButtons = screen.getAllByText('Read');
        expect(readButtons.length).toBeGreaterThan(0);
      });
      
      const readButtons = screen.getAllByText('Read');
      fireEvent.click(readButtons[0]);
      
      // When value is null, should not display any value
      // The component checks `showValue && value` - if value is null, nothing is rendered
      expect(screen.queryByText('No data')).not.toBeInTheDocument();
      expect(screen.queryByText('Value')).not.toBeInTheDocument();
      expect(screen.queryByText('Hex:')).not.toBeInTheDocument();
      expect(screen.queryByText('Text:')).not.toBeInTheDocument();
    });
  });

  describe('Unknown UUIDs', () => {
    it('should display UUID when service name is unknown', () => {
      const unknownService = {
        uuid: 'custom-service-uuid',
        isPrimary: false,
        getCharacteristics: jest.fn().mockResolvedValue([])
      };

      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [unknownService],
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      expect(screen.getByText('custom-service-uuid')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should display UUID when characteristic name is unknown', async () => {
      const unknownChar = [createMockCharacteristic('custom-characteristic-uuid', {
        read: true,
        write: false,
        writeWithoutResponse: false,
        notify: false,
        indicate: false,
        broadcast: false,
        authenticatedSignedWrites: false,
        reliableWrite: false,
        writableAuxiliaries: false
      })];
      
      const serviceWithUnknownChar = {
        uuid: '0000180d-0000-1000-8000-00805f9b34fb',
        isPrimary: true,
        getCharacteristics: jest.fn().mockImplementation(async function() {
          const chars = unknownChar.map(c => ({ ...c, service: this }));
          return chars;
        })
      };

      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [serviceWithUnknownChar],
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByText('custom-characteristic-uuid')).toBeInTheDocument();
      });
    });
  });

  describe('Device name handling', () => {
    it('should show Unknown Device when device has no name', () => {
      const deviceWithoutName = { id: 'test-device-2', name: null };
      
      mockUseDevice.mockReturnValue({
        device: deviceWithoutName,
        services: [],
        connectionState: 'disconnected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-2" />);
      expect(screen.getByText('Unknown Device')).toBeInTheDocument();
    });
  });

  describe('Multiple service toggle', () => {
    it('should handle toggling multiple services independently', async () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      
      // Expand Heart Rate service
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      await waitFor(() => {
        expect(screen.getByText('Heart Rate Measurement')).toBeInTheDocument();
      });
      
      // Expand Battery Service
      fireEvent.click(screen.getByLabelText('Expand Battery Service'));
      await waitFor(() => {
        expect(screen.getByText('Battery Level')).toBeInTheDocument();
      });
      
      // Collapse Heart Rate service
      fireEvent.click(screen.getByLabelText('Collapse Heart Rate'));
      expect(screen.queryByText('Heart Rate Measurement')).not.toBeInTheDocument();
      
      // Battery Service should still be expanded
      expect(screen.getByText('Battery Level')).toBeInTheDocument();
    });
  });

  describe('Write without value', () => {
    it('should not call write when input is empty', async () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByText('Body Sensor Location')).toBeInTheDocument();
      });
      
      const writeButtons = screen.getAllByText('Write');
      fireEvent.click(writeButtons[0]);
      
      await waitFor(() => {
        expect(mockWrite).not.toHaveBeenCalled();
      });
    });
  });

  describe('Special character handling in text display', () => {
    it('should replace control characters with dots in text display', async () => {
      const mockValue = new DataView(new ArrayBuffer(4));
      mockValue.setUint8(0, 0x48); // 'H'
      mockValue.setUint8(1, 0x00); // Null character
      mockValue.setUint8(2, 0x0A); // Line feed
      mockValue.setUint8(3, 0x69); // 'i'

      mockUseCharacteristic.mockImplementation((characteristic, service, device) => ({
        characteristic,
        value: mockValue,
        properties: characteristic?.properties || null,
        read: mockRead.mockResolvedValue(undefined),
        write: mockWrite,
        writeWithoutResponse: jest.fn(),
        subscribe: mockStartNotifications,
        unsubscribe: mockStopNotifications,
        startNotifications: mockStartNotifications,
        stopNotifications: mockStopNotifications,
        isNotifying: false,
        getDescriptor: jest.fn(),
        getDescriptors: jest.fn().mockResolvedValue([]),
        error: null
      }));

      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        const readButtons = screen.getAllByText('Read');
        expect(readButtons.length).toBeGreaterThan(0);
      });
      
      const readButtons = screen.getAllByText('Read');
      fireEvent.click(readButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('Text: H..i')).toBeInTheDocument();
      });
    });
  });

  describe('Clear input after write', () => {
    it('should clear input field after successful write', async () => {
      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: mockServices,
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand Heart Rate'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter value to write')).toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Enter value to write') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'Test' } });
      expect(input.value).toBe('Test');
      
      const writeButtons = screen.getAllByText('Write');
      fireEvent.click(writeButtons[0]);
      
      await waitFor(() => {
        expect(mockWrite).toHaveBeenCalled();
        expect(input.value).toBe('');
      });
    });
  });

  describe('All characteristic properties display', () => {
    it('should display all available property indicators', async () => {
      const allPropsChar = [{
        uuid: 'test-char',
        properties: {
          read: true,
          write: true,
          writeWithoutResponse: true,
          notify: true,
          indicate: true,
          broadcast: false,
          authenticatedSignedWrites: false,
          reliableWrite: false,
          writableAuxiliaries: false
        }
      }];
      
      const serviceWithAllProps = {
        uuid: 'test-service',
        isPrimary: true,
        getCharacteristics: jest.fn().mockResolvedValue(allPropsChar)
      };

      mockUseDevice.mockReturnValue({
        device: mockDevice,
        services: [serviceWithAllProps],
        connectionState: 'connected',
        connect: mockConnect,
        disconnect: mockDisconnect,
        error: null,
        forget: jest.fn(),
        watchAdvertisements: jest.fn(),
        unwatchAdvertisements: jest.fn()
      });

      render(<ServiceExplorer deviceId="test-device-1" />);
      fireEvent.click(screen.getByLabelText('Expand test-service'));
      
      // Wait for the characteristics to load
      await waitFor(() => {
        expect(screen.getByText('R')).toBeInTheDocument();
        expect(screen.getByText('W')).toBeInTheDocument();
        expect(screen.getByText('WNR')).toBeInTheDocument();
        expect(screen.getByText('N')).toBeInTheDocument();
        expect(screen.getByText('I')).toBeInTheDocument();
      });
    });
  });
});