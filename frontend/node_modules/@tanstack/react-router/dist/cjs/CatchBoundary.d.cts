import * as React from 'react';
export declare function CatchBoundary(props: {
    getResetKey: () => string;
    children: any;
    errorComponent?: any;
    onCatch?: (error: any) => void;
}): React.JSX.Element;
export declare function ErrorComponent({ error }: {
    error: any;
}): React.JSX.Element;
