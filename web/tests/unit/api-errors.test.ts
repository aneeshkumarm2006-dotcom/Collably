import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, isApiError, toApiError } from '@/lib/api/errors';

describe('ApiError', () => {
  it('carries status, message and data and extends Error', () => {
    const err = new ApiError(404, 'Not found', { code: 'NOT_FOUND' });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.data).toEqual({ code: 'NOT_FOUND' });
  });

  it('leaves data undefined when not provided', () => {
    expect(new ApiError(500, 'boom').data).toBeUndefined();
  });
});

describe('isApiError', () => {
  it('is true for an ApiError instance', () => {
    expect(isApiError(new ApiError(400, 'x'))).toBe(true);
  });

  it('is false for plain errors, primitives, null and look-alike objects', () => {
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError('x')).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError({ status: 400, message: 'x' })).toBe(false);
  });
});

describe('errorMessage', () => {
  it('returns the ApiError message', () => {
    expect(errorMessage(new ApiError(400, 'Bad input'))).toBe('Bad input');
  });

  it('returns a plain Error message', () => {
    expect(errorMessage(new Error('Kaboom'))).toBe('Kaboom');
  });

  it('uses the fallback for an Error with an empty message', () => {
    expect(errorMessage(new Error(''))).toBe('Something went wrong.');
  });

  it('uses the (default or custom) fallback for non-error values', () => {
    expect(errorMessage('nope')).toBe('Something went wrong.');
    expect(errorMessage(null)).toBe('Something went wrong.');
    expect(errorMessage(undefined)).toBe('Something went wrong.');
    expect(errorMessage(42, 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('toApiError', () => {
  it('extracts the first zod issue ("path: message") from a nested { error: { issues } }', () => {
    const err = toApiError(400, {
      error: {
        issues: [
          { path: 'email', message: 'Invalid email' },
          { path: 'name', message: 'Required' },
        ],
      },
    });
    expect(err.status).toBe(400);
    expect(err.message).toBe('email: Invalid email');
  });

  it('extracts the first zod issue from a flat { issues }', () => {
    const err = toApiError(422, { issues: [{ path: 'password', message: 'Too short' }] });
    expect(err.message).toBe('password: Too short');
  });

  it('omits the path prefix when an issue has no path', () => {
    const err = toApiError(400, { issues: [{ message: 'Body required' }] });
    expect(err.message).toBe('Body required');
  });

  it('accepts a bare string issue entry', () => {
    const err = toApiError(400, { issues: ['Just a string'] });
    expect(err.message).toBe('Just a string');
  });

  it('reads a nested { error: { message } } string', () => {
    expect(toApiError(403, { error: { message: 'Forbidden' } }).message).toBe('Forbidden');
  });

  it('reads a flat { message } string', () => {
    expect(toApiError(409, { message: 'Conflict' }).message).toBe('Conflict');
  });

  it('reads a { message } whose value is an array of strings/objects', () => {
    expect(toApiError(400, { message: ['First message'] }).message).toBe('First message');
    expect(toApiError(400, { message: [{ message: 'Nested message' }] }).message).toBe('Nested message');
  });

  it('reads an { error: "string" } shape', () => {
    expect(toApiError(500, { error: 'Server exploded' }).message).toBe('Server exploded');
  });

  it('uses the network message for status 0', () => {
    expect(toApiError(0, null).message).toBe('Network error. Please check your connection.');
  });

  it('uses the generic fallback for an unrecognised body with a non-zero status', () => {
    expect(toApiError(500, null).message).toBe('Something went wrong.');
    expect(toApiError(500, {}).message).toBe('Something went wrong.');
    expect(toApiError(500, 'raw string body').message).toBe('Something went wrong.');
  });

  it('preserves the raw body on the error data', () => {
    const body = { message: 'Conflict' };
    const err = toApiError(409, body);
    expect(err.data).toBe(body);
  });

  it('prefers a zod issue over a sibling top-level message', () => {
    const err = toApiError(400, {
      message: 'Generic message',
      issues: [{ path: 'title', message: 'Title is required' }],
    });
    expect(err.message).toBe('title: Title is required');
  });
});
