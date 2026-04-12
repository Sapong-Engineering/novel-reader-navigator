import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useReadingProgress } from './useReadingProgress';
import { useTTSProgress } from './useTTSProgress';

describe('progress hooks', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders useReadingProgress without initialization-order errors', () => {
    expect(() => renderHook(() => useReadingProgress('novel-1', 'chapter-1'))).not.toThrow();
  });

  it('renders useTTSProgress without initialization-order errors', () => {
    expect(() => renderHook(() => useTTSProgress('novel-1', 'chapter-1'))).not.toThrow();
  });
});
