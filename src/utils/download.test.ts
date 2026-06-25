import { describe, it, expect, vi } from 'vitest';
import { downloadBlob } from './download';

describe('downloadBlob', () => {
  it('downloads blob via anchor element', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    const blob = new Blob(['data'], { type: 'text/plain' });

    downloadBlob(blob, 'file.txt');

    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
});
