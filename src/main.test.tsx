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

  it('mounts app inside BrowserRouter > ThemeProvider > LanguageRouter', async () => {
    await import('./main');

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalled();

    const tree = renderMock.mock.calls[0][0] as React.ReactElement;
    expect(tree.type).toBe(React.StrictMode);

    // Check BrowserRouter is the first wrapper
    const browserRouter = (tree.props as any).children;
    expect(browserRouter.type.name).toMatch(/Router/i);

    // Check ThemeProvider is inside BrowserRouter
    const themeProvider = (browserRouter.props as any).children;
    expect(themeProvider.type.name).toBe('ThemeProvider');

    // Check LanguageRouter is inside ThemeProvider
    const languageRouter = (themeProvider.props as any).children;
    expect(languageRouter.type.name).toBe('LanguageRouter');
  });
});
