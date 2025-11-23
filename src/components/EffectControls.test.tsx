import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { EffectControls } from './EffectControls';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('EffectControls', () => {
  it('emits presets for each mode', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} />);

    expect(onChange).toHaveBeenCalledWith({ mode: 'speed-up', speedMultiplier: 1.3, reverbAmount: 0 });

    await userEvent.click(screen.getByText('effects.slowReverb'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.7, reverbAmount: 0.5 });

    const slowSpeedSlider = screen.getByLabelText(/effects\.slowSpeed/);
    fireEvent.change(slowSpeedSlider, { target: { value: '0.6' } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.6, reverbAmount: 0.5 });

    const reverbSlider = screen.getByLabelText(/effects\.reverb/);
    fireEvent.change(reverbSlider, { target: { value: '0.4' } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.6, reverbAmount: 0.4 });

    await userEvent.click(screen.getByText('effects.8dAudio'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: '8d-audio', speedMultiplier: 1, reverbAmount: 0, rotationSpeed: 0.4 });

    const rotationSlider = screen.getByLabelText(/effects\.rotationSpeed/);
    fireEvent.change(rotationSlider, { target: { value: '1.2' } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: '8d-audio', speedMultiplier: 1, reverbAmount: 0, rotationSpeed: 1.2 });
  });

  it('ignores interactions when disabled', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} disabled />);

    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText('effects.8dAudio'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
