import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import { FileUploader } from './FileUploader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('FileUploader', () => {
  it('handles drag and drop with accepted file', () => {
    const onFileSelect = vi.fn();
    render(<FileUploader onFileSelect={onFileSelect} />);

    const dropZone = screen.getByLabelText('upload.title');
    const file = new File(['audio'], 'song.mp3', { type: 'audio/mp3' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('ignores unsupported drag type and respects input change', async () => {
    const onFileSelect = vi.fn();
    const { rerender } = render(<FileUploader onFileSelect={onFileSelect} isLoading hasFile />);

    const dropZone = screen.getByLabelText('upload.title');
    const badFile = new File(['audio'], 'song.xyz', { type: 'application/octet-stream' });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [badFile],
      },
    });

    expect(onFileSelect).not.toHaveBeenCalled();

    const input = screen.getByLabelText('upload.browse');
    expect(input).toBeDisabled();

    rerender(<FileUploader onFileSelect={onFileSelect} hasFile />);

    const goodFile = new File(['audio'], 'clip.wav', { type: 'audio/wav' });
    await userEvent.upload(screen.getByLabelText('upload.browse'), goodFile);

    expect(onFileSelect).toHaveBeenCalledWith(goodFile);
  });

  it('prevents default on drag over', () => {
    const onFileSelect = vi.fn();
    render(<FileUploader onFileSelect={onFileSelect} />);

    const dropZone = screen.getByLabelText('upload.title');
    const event = new Event('dragover', { bubbles: true, cancelable: true });
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    fireEvent(dropZone, event);

    expect(event.defaultPrevented).toBe(true);
  });
});
