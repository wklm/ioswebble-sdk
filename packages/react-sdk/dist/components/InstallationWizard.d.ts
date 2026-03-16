import React from 'react';
interface InstallationWizardProps {
    onComplete?: () => void;
    /** App Store URL override */
    appStoreUrl?: string;
    /** Operator/app name shown in the prompt */
    operatorName?: string;
    className?: string;
}
export declare const navigationController: {
    navigateToUrl(url: string): void;
};
/**
 * InstallationWizard - iOS-native style extension installation prompt.
 *
 * Renders as a bottom sheet overlay on iOS Safari, or a simple
 * inline message on other platforms.
 */
export declare function InstallationWizard({ onComplete, appStoreUrl, operatorName, className, }: InstallationWizardProps): React.JSX.Element | null;
export {};
