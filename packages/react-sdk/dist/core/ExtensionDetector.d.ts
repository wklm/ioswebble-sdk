/**
 * ExtensionDetector - Automatically detects if the WebBLE Safari extension is installed
 */
export declare class ExtensionDetector {
    private isDetected;
    private detectionPromise;
    private readonly DETECTION_TIMEOUT;
    /**
     * Determine whether the given user agent represents Safari (excluding
     * iOS in-app/alternate browsers such as Chrome iOS, Firefox iOS, Edge iOS,
     * and Opera iOS).
     *
     * This keeps Safari detection logic consistent between isBrowserSupported()
     * and getBrowserCompatibilityMessage().
     */
    private isSafariUserAgent;
    /**
     * Check if the extension is installed.
     * Checks the global marker and navigator.webble / navigator.bluetooth markers set by the extension.
     */
    isInstalled(): boolean;
    /**
     * Detect extension with a timeout
     */
    detect(): Promise<boolean>;
    /**
     * Perform the actual detection
     */
    private performDetection;
    /**
     * Get installation instructions for iOS Safari
     */
    getInstallationInstructions(): string;
    /**
     * Open the extension store for installation
     */
    openExtensionStore(): void;
    /**
     * Check if the browser supports Web Bluetooth
     */
    isBrowserSupported(): boolean;
    /**
     * Get browser compatibility message
     */
    getBrowserCompatibilityMessage(): string | null;
}
