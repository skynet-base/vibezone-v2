import React, { Component, ReactNode } from 'react';

interface Props {
    fallback?: ReactNode;
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

export class ErrorBoundary3D extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('3D ErrorBoundary caught an error in R3F Canvas:', error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}
