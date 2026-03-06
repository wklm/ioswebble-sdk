import {
  getServiceName,
  getCharacteristicName,
  parseValue,
  formatValue,
  canonicalUUID,
  matchesNameFilter,
  calculateDistance,
  formatBytes,
  debounce
} from '../../src/utils/bluetooth-utils';

describe('bluetooth-utils', () => {
  describe('getServiceName', () => {
    it('should return standard service names', () => {
      expect(getServiceName('0x1800')).toBe('Generic Access');
      expect(getServiceName('0x180D')).toBe('Heart Rate');
      expect(getServiceName('0x180F')).toBe('Battery Service');
      expect(getServiceName('0x180A')).toBe('Device Information');
    });

    it('should handle case insensitive UUIDs', () => {
      expect(getServiceName('0x1800')).toBe('Generic Access');
      expect(getServiceName('0X1800')).toBe('Generic Access');
      expect(getServiceName('0x180d')).toBe('Heart Rate');
    });

    it('should return UUID for unknown services', () => {
      expect(getServiceName('0x9999')).toBe('0x9999');
      expect(getServiceName('custom-uuid')).toBe('custom-uuid');
    });
  });

  describe('getCharacteristicName', () => {
    it('should return standard characteristic names', () => {
      expect(getCharacteristicName('0x2A00')).toBe('Device Name');
      expect(getCharacteristicName('0x2A19')).toBe('Battery Level');
      expect(getCharacteristicName('0x2A37')).toBe('Heart Rate Measurement');
      expect(getCharacteristicName('0x2A29')).toBe('Manufacturer Name String');
    });

    it('should handle case insensitive UUIDs', () => {
      expect(getCharacteristicName('0x2a00')).toBe('Device Name');
      expect(getCharacteristicName('0X2A19')).toBe('Battery Level');
    });

    it('should return UUID for unknown characteristics', () => {
      expect(getCharacteristicName('0x9999')).toBe('0x9999');
      expect(getCharacteristicName('custom-uuid')).toBe('custom-uuid');
    });
  });

  describe('parseValue', () => {
    it('should parse battery level', () => {
      const buffer = new ArrayBuffer(1);
      const view = new DataView(buffer);
      view.setUint8(0, 75);
      
      expect(parseValue(view, '0x2A19')).toBe(75);
    });

    it('should parse heart rate measurement (8-bit)', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      view.setUint8(0, 0x00); // Flags: 8-bit heart rate
      view.setUint8(1, 72);
      
      expect(parseValue(view, '0x2A37')).toBe(72);
    });

    it('should parse heart rate measurement (16-bit)', () => {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0x01); // Flags: 16-bit heart rate
      view.setUint16(1, 180, true); // Little endian
      
      expect(parseValue(view, '0x2A37')).toBe(180);
    });

    it('should parse string values', () => {
      const text = 'Test Device';
      const encoder = new TextEncoder();
      const buffer = encoder.encode(text).buffer;
      const view = new DataView(buffer);
      
      expect(parseValue(view, '0x2A00')).toBe(text);
      expect(parseValue(view, '0x2A29')).toBe(text);
    });

    it('should return hex string for unknown characteristics', () => {
      const buffer = new ArrayBuffer(3);
      const view = new DataView(buffer);
      view.setUint8(0, 0x01);
      view.setUint8(1, 0x02);
      view.setUint8(2, 0xFF);
      
      expect(parseValue(view, '0x9999')).toBe('01 02 ff');
    });
  });

  describe('formatValue', () => {
    it('should format battery level', () => {
      const buffer = formatValue(85, '0x2A19');
      const view = new DataView(buffer);
      
      expect(view.getUint8(0)).toBe(85);
    });

    it('should format string values', () => {
      const text = 'Device Name';
      const buffer = formatValue(text, '0x2A00');
      const decoder = new TextDecoder();
      
      expect(decoder.decode(buffer)).toBe(text);
    });

    it('should pass through ArrayBuffer', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint32(0, 0x12345678);
      
      const result = formatValue(buffer, '0x9999');
      expect(result).toBe(buffer);
    });

    it('should convert Uint8Array to ArrayBuffer', () => {
      const array = new Uint8Array([1, 2, 3, 4]);
      const buffer = formatValue(array, '0x9999');
      
      // The buffer should contain the same data but be a new ArrayBuffer
      const view = new DataView(buffer);
      expect(view.getUint8(0)).toBe(1);
      expect(view.getUint8(1)).toBe(2);
      expect(view.getUint8(2)).toBe(3);
      expect(view.getUint8(3)).toBe(4);
      expect(buffer.byteLength).toBe(4);
    });

    it('should parse hex string', () => {
      const hexString = '01 02 ff';
      const buffer = formatValue(hexString, '0x9999');
      const view = new DataView(buffer);
      
      expect(view.getUint8(0)).toBe(0x01);
      expect(view.getUint8(1)).toBe(0x02);
      expect(view.getUint8(2)).toBe(0xff);
    });

    it('should throw error for unsupported value types', () => {
      expect(() => formatValue({}, '0x9999')).toThrow('Cannot format value');
    });
  });

  describe('canonicalUUID', () => {
    it('should expand 4-character UUID', () => {
      expect(canonicalUUID('180d')).toBe('0000180d-0000-1000-8000-00805f9b34fb');
      expect(canonicalUUID('2a19')).toBe('00002a19-0000-1000-8000-00805f9b34fb');
    });

    it('should expand 8-character UUID', () => {
      expect(canonicalUUID('12345678')).toBe('12345678-0000-1000-8000-00805f9b34fb');
    });

    it('should handle numeric UUID', () => {
      expect(canonicalUUID(0x180d)).toBe('0000180d-0000-1000-8000-00805f9b34fb');
      expect(canonicalUUID(0x2a19)).toBe('00002a19-0000-1000-8000-00805f9b34fb');
    });

    it('should lowercase full UUID', () => {
      const fullUUID = '12345678-9ABC-DEF0-1234-567890ABCDEF';
      expect(canonicalUUID(fullUUID)).toBe('12345678-9abc-def0-1234-567890abcdef');
    });

    it('should return already canonical UUID unchanged', () => {
      const canonical = '12345678-9abc-def0-1234-567890abcdef';
      expect(canonicalUUID(canonical)).toBe(canonical);
    });
  });

  describe('matchesNameFilter', () => {
    it('should match exact name', () => {
      expect(matchesNameFilter('Test Device', { name: 'Test Device' })).toBe(true);
      expect(matchesNameFilter('Other Device', { name: 'Test Device' })).toBe(false);
    });

    it('should match name prefix', () => {
      expect(matchesNameFilter('Test Device', { namePrefix: 'Test' })).toBe(true);
      expect(matchesNameFilter('Device Test', { namePrefix: 'Test' })).toBe(false);
    });

    it('should return false for undefined device name', () => {
      expect(matchesNameFilter(undefined, { name: 'Test' })).toBe(false);
      expect(matchesNameFilter(undefined, { namePrefix: 'Test' })).toBe(false);
    });

    it('should return true if no filter specified', () => {
      expect(matchesNameFilter('Any Device', {})).toBe(true);
    });

    it('should prioritize exact name over prefix', () => {
      expect(matchesNameFilter('Test Device', { 
        name: 'Test Device',
        namePrefix: 'Other' 
      })).toBe(true);
      
      expect(matchesNameFilter('Other Device', { 
        name: 'Test Device',
        namePrefix: 'Other' 
      })).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance from RSSI', () => {
      // At 1 meter, RSSI should equal txPower
      expect(calculateDistance(-59, -59)).toBe(1);
      
      // Stronger signal = closer
      expect(calculateDistance(-40, -59)).toBeLessThan(1);
      
      // Weaker signal = farther
      expect(calculateDistance(-70, -59)).toBeGreaterThan(1);
    });

    it('should use default txPower', () => {
      const distance = calculateDistance(-70);
      expect(distance).toBeGreaterThan(1);
    });

    it('should round to 2 decimal places', () => {
      const distance = calculateDistance(-65, -59);
      expect(distance.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(formatBytes(100)).toBe('100.00 B');
      expect(formatBytes(1023)).toBe('1023.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(2048)).toBe('2.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatBytes(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('should debounce function calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');
      
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should preserve this context', () => {
      const context = { value: 42 };
      const mockFn = jest.fn(function(this: any) {
        return this.value;
      });
      
      const debouncedFn = debounce(mockFn, 100);
      debouncedFn.call(context);
      
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn.mock.instances[0]).toBe(context);
    });

    it('should handle multiple arguments', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn(1, 'two', { three: 3 });
      
      jest.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledWith(1, 'two', { three: 3 });
    });

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);
      
      debouncedFn('first');
      jest.advanceTimersByTime(50);
      
      debouncedFn('second');
      jest.advanceTimersByTime(50);
      
      expect(mockFn).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(50);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('second');
    });
  });
});