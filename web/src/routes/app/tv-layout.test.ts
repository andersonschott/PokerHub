import { describe, it, expect } from 'vitest';
import { selectTvLayout } from './tv-layout';

describe('selectTvLayout', () => {
  it('≥900px (não-narrow) é sempre wide, ignorando orientação', () => {
    expect(selectTvLayout(false, true)).toBe('wide');
    expect(selectTvLayout(false, false)).toBe('wide');
  });

  it('≤900px em pé → portrait', () => {
    expect(selectTvLayout(true, true)).toBe('portrait');
  });

  it('≤900px deitado → landscape-compact (mini-TV)', () => {
    expect(selectTvLayout(true, false)).toBe('landscape-compact');
  });
});
