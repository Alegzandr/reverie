import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('returns null when idle', () => {
    const { container } = render(<ProgressBar progress={0} isProcessing={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows progress when processing', () => {
    const { container } = render(<ProgressBar progress={42} isProcessing message="Working" />);

    expect(screen.getByText('Working')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    const bar = container.querySelector('.h-full') as HTMLElement;
    expect(bar).toHaveStyle({ width: '42%' });
  });

  it('falls back to default message', () => {
    render(<ProgressBar progress={10} isProcessing />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });
});
