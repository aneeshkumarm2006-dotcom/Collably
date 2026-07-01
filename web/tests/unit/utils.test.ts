import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges multiple class name strings with a single space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('resolves conflicting Tailwind utilities, keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
    expect(cn('p-2', 'p-4', 'p-1')).toBe('p-1');
  });

  it('keeps non-conflicting Tailwind utilities side by side', () => {
    expect(cn('px-2', 'py-4')).toBe('px-2 py-4');
  });

  it('drops falsy values (false, null, undefined, empty string, 0)', () => {
    expect(cn('a', false, null, undefined, '', 0)).toBe('a');
    expect(cn(false && 'hidden', 'shown')).toBe('shown');
  });

  it('returns an empty string when nothing is provided or all are falsy', () => {
    expect(cn()).toBe('');
    expect(cn(false, null, undefined, '')).toBe('');
  });

  it('flattens array inputs (clsx semantics)', () => {
    expect(cn(['a', 'b'])).toBe('a b');
    expect(cn(['a', ['b', 'c']], 'd')).toBe('a b c d');
    expect(cn(['px-2', false, 'px-4'])).toBe('px-4');
  });

  it('includes object keys whose values are truthy (clsx semantics)', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c');
    expect(cn('base', { active: true, disabled: false })).toBe('base active');
  });

  it('resolves conflicts across mixed string/array/object inputs', () => {
    expect(cn('px-2', ['py-1', 'px-8'], { 'px-4': true })).toBe('py-1 px-4');
  });

  it('handles a realistic conditional className pattern', () => {
    const isActive = true;
    const isDisabled = false;
    expect(
      cn(
        'rounded-md px-4 py-2',
        isActive && 'bg-blue-500',
        isDisabled && 'opacity-50',
      ),
    ).toBe('rounded-md px-4 py-2 bg-blue-500');
  });
});
