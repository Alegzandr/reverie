import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BeatToggle } from './BeatToggle';

describe('BeatToggle', () => {
  it('names the switch by its label and describes it with the badge and supporting line', () => {
    render(<BeatToggle label="Beat sync" badge="Beta" description="120 BPM" pressed={false} onToggle={vi.fn()} />);
    const toggle = screen.getByRole('switch', { name: 'Beat sync' });
    expect(toggle).toHaveAccessibleDescription('Beta 120 BPM');
  });

  it('has no description when there is nothing to add', () => {
    render(<BeatToggle label="Beat sync" pressed onToggle={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'Beat sync' })).not.toHaveAttribute('aria-describedby');
  });
});
