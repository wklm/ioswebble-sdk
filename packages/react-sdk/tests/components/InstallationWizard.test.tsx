import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InstallationWizard } from '../../src/components/InstallationWizard';
import { ExtensionDetector } from '../../src/core/ExtensionDetector';

// Mock ExtensionDetector
jest.mock('../../src/core/ExtensionDetector');

const MockExtensionDetector = ExtensionDetector as jest.MockedClass<typeof ExtensionDetector>;

describe('InstallationWizard', () => {
  let mockDetector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instance methods
    mockDetector = {
      detect: jest.fn(),
      getInstallationInstructions: jest.fn(),
      openExtensionStore: jest.fn()
    };
    
    // Mock constructor to return our mock instance
    MockExtensionDetector.mockImplementation(() => mockDetector);
  });

  describe('Initial loading state', () => {
    it('should show checking message initially', async () => {
      mockDetector.detect.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<InstallationWizard />);
      
      expect(screen.getByText('Checking for WebBLE extension...')).toBeInTheDocument();
    });
  });

  describe('Extension installed state', () => {
    it('should show installed message when extension is detected', async () => {
      mockDetector.detect.mockResolvedValue(true);
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText('✓ WebBLE extension is installed')).toBeInTheDocument();
      });
    });

    it('should call onComplete callback when extension is installed', async () => {
      mockDetector.detect.mockResolvedValue(true);
      const onComplete = jest.fn();
      
      render(<InstallationWizard onComplete={onComplete} />);
      
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('should not show installation instructions when installed', async () => {
      mockDetector.detect.mockResolvedValue(true);
      mockDetector.getInstallationInstructions.mockReturnValue('Installation instructions');
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.queryByText('WebBLE Extension Required')).not.toBeInTheDocument();
        expect(screen.queryByText('Installation instructions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Extension not installed state', () => {
    beforeEach(() => {
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue(
        'To install WebBLE:\n1. Visit the extension store\n2. Click Install\n3. Restart your browser'
      );
    });

    it('should show installation required message', async () => {
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText('WebBLE Extension Required')).toBeInTheDocument();
      });
    });

    it('should display installation instructions', async () => {
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText(/To install WebBLE/)).toBeInTheDocument();
        expect(screen.getByText(/Visit the extension store/)).toBeInTheDocument();
        expect(screen.getByText(/Click Install/)).toBeInTheDocument();
        expect(screen.getByText(/Restart your browser/)).toBeInTheDocument();
      });
    });

    it('should show install button', async () => {
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText('Install Extension')).toBeInTheDocument();
      });
    });

    it('should call openExtensionStore when install button clicked', async () => {
      render(<InstallationWizard />);
      
      await waitFor(() => {
        const button = screen.getByText('Install Extension');
        fireEvent.click(button);
        expect(mockDetector.openExtensionStore).toHaveBeenCalled();
      });
    });

    it('should not call onComplete when extension is not installed', async () => {
      const onComplete = jest.fn();
      
      render(<InstallationWizard onComplete={onComplete} />);
      
      await waitFor(() => {
        expect(screen.getByText('WebBLE Extension Required')).toBeInTheDocument();
      });
      
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Props handling', () => {
    it('should apply custom className to all states', async () => {
      const className = 'custom-wizard';
      
      // Test checking state
      let resolveDetect: ((value: boolean) => void) | null = null;
      mockDetector.detect.mockImplementation(() => new Promise((resolve) => {
        resolveDetect = resolve;
      }));
      
      const { rerender, unmount } = render(<InstallationWizard className={className} />);
      expect(screen.getByText('Checking for WebBLE extension...')).toBeInTheDocument();
      
      // Complete the detection for installed state
      act(() => {
        resolveDetect?.(true);
      });
      
      await waitFor(() => {
        expect(screen.getByText('✓ WebBLE extension is installed')).toBeInTheDocument();
        const element = screen.getByText('✓ WebBLE extension is installed').closest('div');
        expect(element).toHaveClass(className);
      });
      
      unmount();
      
      // Test not installed state with a fresh component
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue('Instructions');
      
      render(<InstallationWizard className={className} />);
      
      await waitFor(() => {
        expect(screen.getByText('WebBLE Extension Required')).toBeInTheDocument();
        const element = screen.getByText('WebBLE Extension Required').closest('div');
        expect(element).toHaveClass(className);
      });
    });

    it('should handle undefined onComplete', async () => {
      mockDetector.detect.mockResolvedValue(true);
      
      // Should not throw when onComplete is undefined
      expect(() => {
        render(<InstallationWizard />);
      }).not.toThrow();
      
      await waitFor(() => {
        expect(screen.getByText('✓ WebBLE extension is installed')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle detection errors gracefully', async () => {
      mockDetector.detect.mockRejectedValue(new Error('Detection failed'));
      
      // Component should handle error internally
      render(<InstallationWizard />);
      
      await waitFor(() => {
        // Should default to not installed state on error
        expect(screen.queryByText('Checking for WebBLE extension...')).not.toBeInTheDocument();
      });
    });

    it('should handle empty installation instructions', async () => {
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue('');
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText('WebBLE Extension Required')).toBeInTheDocument();
        // Should still render the div even if instructions are empty
        const instructionsDiv = screen.getByText('WebBLE Extension Required').nextElementSibling;
        expect(instructionsDiv).toBeInTheDocument();
      });
    });

    it('should handle null installation instructions', async () => {
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue(null);
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText('WebBLE Extension Required')).toBeInTheDocument();
        // Component should handle null gracefully
        expect(screen.getByText('Install Extension')).toBeInTheDocument();
      });
    });

    it('should handle openExtensionStore errors', async () => {
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue('Instructions');
      mockDetector.openExtensionStore.mockImplementation(() => {
        throw new Error('Failed to open');
      });
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        const button = screen.getByText('Install Extension');
        // Should not throw when clicking even if openExtensionStore fails
        expect(() => fireEvent.click(button)).not.toThrow();
      });
    });
  });

  describe('Re-detection behavior', () => {
    it('should only check once on mount', async () => {
      mockDetector.detect.mockResolvedValue(false);
      
      const { rerender } = render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText('WebBLE Extension Required')).toBeInTheDocument();
      });
      
      expect(mockDetector.detect).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<InstallationWizard />);
      
      // Should not detect again
      expect(mockDetector.detect).toHaveBeenCalledTimes(1);
    });

    it('should create new detector instance on each mount', () => {
      render(<InstallationWizard />);
      expect(MockExtensionDetector).toHaveBeenCalledTimes(1);
      
      // Unmount and remount
      const { unmount } = render(<InstallationWizard />);
      unmount();
      
      render(<InstallationWizard />);
      expect(MockExtensionDetector).toHaveBeenCalledTimes(3); // Initial + second render + third render
    });
  });

  describe('Styling', () => {
    it('should apply whitespace preservation for instructions', async () => {
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue('Line 1\nLine 2\nLine 3');
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        const instructionsText = screen.getByText(/Line 1[\s\S]*Line 2[\s\S]*Line 3/);
        // The style is applied to this div directly
        expect(instructionsText).toHaveStyle({ whiteSpace: 'pre-line' });
      });
    });
  });

  describe('Async behavior', () => {
    it('should handle slow detection', async () => {
      let resolveDetection: (value: boolean) => void;
      const detectionPromise = new Promise<boolean>((resolve) => {
        resolveDetection = resolve;
      });
      
      mockDetector.detect.mockReturnValue(detectionPromise);
      
      render(<InstallationWizard />);
      
      // Should show checking state
      expect(screen.getByText('Checking for WebBLE extension...')).toBeInTheDocument();
      
      // Resolve detection
      resolveDetection!(true);
      
      // Should show installed state
      await waitFor(() => {
        expect(screen.getByText('✓ WebBLE extension is installed')).toBeInTheDocument();
      });
    });

    it('should handle rapid unmounting during detection', () => {
      mockDetector.detect.mockImplementation(() => new Promise(() => {})); // Never resolves
      
      const { unmount } = render(<InstallationWizard />);
      
      // Should not throw when unmounting during detection
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined className', async () => {
      mockDetector.detect.mockResolvedValue(true);
      
      render(<InstallationWizard className={undefined} />);
      
      await waitFor(() => {
        expect(screen.getByText('✓ WebBLE extension is installed')).toBeInTheDocument();
      });
    });

    it('should handle special characters in instructions', async () => {
      mockDetector.detect.mockResolvedValue(false);
      mockDetector.getInstallationInstructions.mockReturnValue(
        '<script>alert("xss")</script>\n& Special chars < > " \''
      );
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        // React should escape special characters automatically
        const instructionsText = screen.getByText(/<script>alert/);
        expect(instructionsText).toBeInTheDocument();
      });
    });

    it('should handle very long installation instructions', async () => {
      mockDetector.detect.mockResolvedValue(false);
      const longInstructions = 'Step '.repeat(1000) + 'End';
      mockDetector.getInstallationInstructions.mockReturnValue(longInstructions);
      
      render(<InstallationWizard />);
      
      await waitFor(() => {
        expect(screen.getByText(/Step.*End/)).toBeInTheDocument();
      });
    });
  });
});