import { describe, it, expect } from 'vitest';
import { describeError } from './errorMessages';
import { ERROR_MESSAGES } from '../constants';

describe('describeError', () => {
  it('maps engine messages onto translated copy', () => {
    expect(describeError(`${ERROR_MESSAGES.LOAD_FAILED}: Unable to decode audio data`)).toEqual({ key: 'errors.loadFailed' });
    expect(describeError(ERROR_MESSAGES.FILE_TOO_LARGE(500))).toEqual({ key: 'errors.tooLarge', params: { max: 500 } });
    expect(describeError(ERROR_MESSAGES.MIME_TYPE_NOT_SUPPORTED('audio/ogg'))).toEqual({ key: 'errors.exportFailed' });
    expect(describeError(ERROR_MESSAGES.NO_AUDIO_TO_EXPORT)).toEqual({ key: 'errors.noAudio' });
    expect(describeError('EncodingError: something else')).toEqual({ key: 'errors.generic' });
  });
});
