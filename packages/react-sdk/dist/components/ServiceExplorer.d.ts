import React from 'react';
interface ServiceExplorerProps {
    deviceId?: string;
    className?: string;
    autoConnect?: boolean;
    onCharacteristicSelect?: (characteristicId: string) => void;
    expandedByDefault?: boolean;
}
/**
 * ServiceExplorer - GATT hierarchy viewer component
 */
export declare function ServiceExplorer({ deviceId, className, autoConnect, onCharacteristicSelect, expandedByDefault }: ServiceExplorerProps): React.JSX.Element;
export {};
//# sourceMappingURL=ServiceExplorer.d.ts.map