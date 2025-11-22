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

    expect(onChange).toHaveBeenCalledWith({ speedMultiplier: 1.2, reverbAmount: 0 });

    await userEvent.click(screen.getByText('effects.slowReverb'));
    expect(onChange).toHaveBeenLastCalledWith({ speedMultiplier: 0.8, reverbAmount: 0.3 });

    const reverbSlider = screen.getByLabelText(/effects\.reverb/);
    fireEvent.change(reverbSlider, { target: { value: '0.4' } });
    expect(onChange).toHaveBeenLastCalledWith({ speedMultiplier: 0.8, reverbAmount: 0.4 });

    await userEvent.click(screen.getByText('effects.8bit'));
    expect(onChange).toHaveBeenLastCalledWith({ speedMultiplier: 1, reverbAmount: 0, bitDepth: 8, sampleRateReduction: 4 });

    const bitDepthSlider = screen.getByLabelText(/effects\.bitDepth/);
    fireEvent.change(bitDepthSlider, { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith({ speedMultiplier: 1, reverbAmount: 0, bitDepth: 9, sampleRateReduction: 4 });

    const sampleRateSlider = screen.getByLabelText(/effects\.sampleRate/);
    fireEvent.change(sampleRateSlider, { target: { value: '3' } });
    expect(onChange).toHaveBeenLastCalledWith({ speedMultiplier: 1, reverbAmount: 0, bitDepth: 9, sampleRateReduction: 3 });
  });

  it('ignores interactions when disabled', async () => {
    const onChange = vi.fn();
    render(<EffectControls onChange={onChange} disabled />);

    expect(onChange).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByText('effects.8bit'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
