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

  it('mounts app inside ThemeProvider', async () => {
    await import('./main');

    expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderMock).toHaveBeenCalled();

    const tree: React.ReactElement = renderMock.mock.calls[0][0];
    expect(tree.type).toBe(React.StrictMode);
    const provider = (tree.props.children as React.ReactElement).type as any;
    expect(provider.name).toBe('ThemeProvider');
  });
});
