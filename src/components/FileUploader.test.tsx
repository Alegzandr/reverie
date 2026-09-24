import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { FileUploader } from './FileUploader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('FileUploader', () => {
  it('handles drag and drop with accepted file', async () => {
    const onFilesSelect = vi.fn();
    render(<FileUploader onFilesSelect={onFilesSelect} />);

    const dropZone = screen.getByLabelText('upload.title');
    const file = new File(['audio'], 'song.mp3', { type: 'audio/mp3' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await vi.waitFor(() => expect(onFilesSelect).toHaveBeenCalledWith([file]));
  });

  it('ignores unsupported drag type and respects input change', async () => {
    const onFilesSelect = vi.fn();
    const { rerender } = render(<FileUploader onFilesSelect={onFilesSelect} isLoading hasFile />);

    const dropZone = screen.getByLabelText('upload.title');
    const badFile = new File(['audio'], 'song.xyz', { type: 'application/octet-stream' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [badFile],
      },
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(onFilesSelect).not.toHaveBeenCalled();

    const input = screen.getByLabelText('upload.browse');
    expect(input).toBeDisabled();

    rerender(<FileUploader onFilesSelect={onFilesSelect} hasFile />);

    const goodFile = new File(['audio'], 'clip.wav', { type: 'audio/wav' });
    await userEvent.upload(screen.getByLabelText('upload.browse'), goodFile);

    expect(onFilesSelect).toHaveBeenCalledWith([goodFile]);
  });

  it('prevents default on drag over', () => {
    const onFilesSelect = vi.fn();
    render(<FileUploader onFilesSelect={onFilesSelect} />);

    const dropZone = screen.getByLabelText('upload.title');
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    fireEvent(dropZone, event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('opens the picker from a real, keyboard-reachable button', async () => {
    render(<FileUploader onFilesSelect={vi.fn()} />);
    const input = screen.getByLabelText('upload.browse') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    await userEvent.tab();
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalled();
  });
});
