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

    // Slow + Reverb is the default active mode.
    expect(onChange).toHaveBeenCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.7, reverbAmount: 0.5 });

    await userEvent.click(screen.getByText('effects.speedUp'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'speed-up', speedMultiplier: 1.3, reverbAmount: 0 });

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

    // Clicking the active effect powers it off — the untouched track plays through.
    // "Original" is the absence of an active effect, not a selectable row.
    await userEvent.click(screen.getByText('effects.8dAudio'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'none', speedMultiplier: 1, reverbAmount: 0 });
  });

  it('toggles the active effect off back to the untouched track', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} />);

    // Slow + Reverb starts Active; clicking it again powers it off.
    await userEvent.click(screen.getByText('effects.slowReverb'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'none', speedMultiplier: 1, reverbAmount: 0 });

    // Re-selecting brings the effect back with its preset.
    await userEvent.click(screen.getByText('effects.slowReverb'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.7, reverbAmount: 0.5 });
  });

  it('restores a slider to its default on a quick double-click', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} />);

    const slowSpeedSlider = screen.getByLabelText(/effects\.slowSpeed/);
    fireEvent.change(slowSpeedSlider, { target: { value: '0.6' } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.6, reverbAmount: 0.5 });

    // Two clicks within the reset window snap back to the default.
    let now = 1000;
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);
    fireEvent.click(slowSpeedSlider);
    now = 1100;
    fireEvent.click(slowSpeedSlider);
    nowSpy.mockRestore();
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.7, reverbAmount: 0.5 });
  });

  it('does not reset a slider when the two clicks are too far apart', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} />);

    const slowSpeedSlider = screen.getByLabelText(/effects\.slowSpeed/);
    fireEvent.change(slowSpeedSlider, { target: { value: '0.6' } });
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.6, reverbAmount: 0.5 });

    // Two separate, slower clicks must not be read as a reset.
    let now = 1000;
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);
    fireEvent.click(slowSpeedSlider);
    now = 1400;
    fireEvent.click(slowSpeedSlider);
    nowSpy.mockRestore();
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'slow-reverb', speedMultiplier: 0.6, reverbAmount: 0.5 });
  });

  it('ignores interactions when disabled', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} disabled />);

    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText('effects.8dAudio'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
