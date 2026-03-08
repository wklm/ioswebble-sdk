# Heart Rate Monitor Example

A complete example demonstrating how to build a heart rate monitoring application using the @ios-web-bluetooth/react SDK.

## Features

- 🫀 Real-time heart rate monitoring
- 📊 Historical data visualization
- 💾 Data recording and export to CSV
- 🔌 Connection quality monitoring
- ♿ Full accessibility support
- 📱 Responsive design

## Prerequisites

1. A Bluetooth Low Energy (BLE) heart rate monitor
2. WebBLE Safari Extension installed (for Safari)
3. Chrome/Edge (for native Web Bluetooth support)

## Getting Started

### Installation

```bash
npm install
```

### Running the Example

```bash
npm start
```

The application will open at http://localhost:3000

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test:watch

# Coverage report
npm test:coverage
```

## How It Works

### 1. Device Connection

The app uses the Web Bluetooth API to discover and connect to heart rate monitors:

```tsx
const { requestDevice } = WebBLE.useBluetooth();

const device = await requestDevice({
  filters: [{ services: ['heart_rate'] }],
  optionalServices: ['battery_service']
});
```

### 2. Real-time Data

Once connected, the app subscribes to heart rate notifications:

```tsx
const { value, isSubscribed } = WebBLE.useNotifications(
  'heart_rate_measurement'
);
```

### 3. Data Parsing

Heart rate data is parsed according to the Bluetooth specification:

```tsx
const flags = value.getUint8(0);
const is16Bit = flags & 0x01;
const heartRate = is16Bit 
  ? value.getUint16(1, true) 
  : value.getUint8(1);
```

### 4. Data Recording

Users can record their heart rate data and export it as CSV:

```tsx
const recordedData = [];

// Record data points
recordedData.push({
  timestamp: Date.now(),
  heartRate: currentHeartRate,
  contactDetected: true
});

// Export as CSV
exportToCSV(recordedData);
```

## Key Components

### HeartRateMonitor

The main component that manages the entire heart rate monitoring flow:

- **Connection Management**: Handles device discovery and connection
- **Data Processing**: Parses and displays heart rate data
- **Recording**: Records heart rate data for export
- **UI State**: Manages connection states and error handling

### Features Demonstrated

1. **Device Discovery**
   - Filtering by service UUID
   - Optional services

2. **Connection Management**
   - Auto-reconnection
   - Connection quality monitoring
   - Graceful disconnection

3. **Notifications**
   - Real-time data streaming
   - Notification subscription management
   - Data history tracking

4. **Error Handling**
   - Connection failures
   - Permission denials
   - Device not found

5. **Accessibility**
   - ARIA labels
   - Screen reader announcements
   - Keyboard navigation

## Heart Rate Service Specification

This example implements the standard Bluetooth Heart Rate Service (0x180D):

### Services
- **Heart Rate Service**: `0x180D`
- **Battery Service**: `0x180F` (optional)

### Characteristics
- **Heart Rate Measurement**: `0x2A37`
  - Notifiable characteristic
  - Contains heart rate value and optional metadata

### Data Format
```
Byte 0: Flags
  Bit 0: Heart Rate format (0 = UINT8, 1 = UINT16)
  Bit 1-2: Sensor Contact Status
  Bit 3: Energy Expended present
  Bit 4: RR-Interval present

Byte 1(-2): Heart Rate Value
Byte N: Energy Expended (optional)
Byte N+2: RR-Intervals (optional, multiple values)
```

## Customization

### Styling

Edit `HeartRateMonitor.css` to customize the appearance:

```css
.heart-rate-monitor {
  /* Your custom styles */
}
```

### Data Processing

Modify the data parsing logic to handle additional fields:

```tsx
const energyExpended = value.getUint16(offset, true);
const rrIntervals = [];
while (offset < value.byteLength) {
  rrIntervals.push(value.getUint16(offset, true));
  offset += 2;
}
```

### Export Formats

Add support for different export formats:

```tsx
// JSON export
const json = JSON.stringify(recordedData, null, 2);

// XML export
const xml = dataToXML(recordedData);
```

## Troubleshooting

### Device Not Found
- Ensure your heart rate monitor is in pairing mode
- Check that Bluetooth is enabled on your device
- Verify the device supports the Heart Rate Service

### Connection Failed
- Move closer to the device
- Turn the device off and on again
- Check for interference from other Bluetooth devices

### No Data Received
- Ensure the heart rate monitor is worn correctly
- Check that notifications are enabled
- Verify the characteristic supports notifications

## Learn More

- [Web Bluetooth Specification](https://webbluetoothcg.github.io/web-bluetooth/)
- [Heart Rate Service Specification](https://www.bluetooth.com/specifications/gatt/services/)
- [@ios-web-bluetooth/react Documentation](https://github.com/wklm/WebBLE-Safari-Extension)

## License

MIT