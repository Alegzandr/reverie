import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock,
}));

vi.mock('./App.tsx', () => ({
  default: () => <div data-testid="app" />,
}));

describe('main entry', () => {
  beforeEach(() => {
    vi.resetModules();
    renderMock.mockClear();
    createRootMock.mockClear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts app inside ErrorBoundary > ThemeProvider', async () => {
    await import('./main');

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalled();

    const tree = renderMock.mock.calls[0][0] as React.ReactElement;
    expect(tree.type).toBe(React.StrictMode);

    // Check ErrorBoundary is the first wrapper
    const errorBoundary = (tree.props as any).children;
    expect(errorBoundary.type.name).toBe('ErrorBoundary');

    // Check ThemeProvider is inside ErrorBoundary (no router: language lives in localStorage)
    const themeProvider = (errorBoundary.props as any).children;
    expect(themeProvider.type.name).toBe('ThemeProvider');

    // App is rendered directly inside ThemeProvider
    const app = (themeProvider.props as any).children;
    expect(app).toBeTruthy();
  });
});
