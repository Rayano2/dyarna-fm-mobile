import { describe, expect, it } from 'vitest';
import { formatBellBadge } from './bell-badge';

describe('formatBellBadge', () => {
  it('hides the badge for no count, zero, negatives and NaN', () => {
    expect(formatBellBadge()).toBeNull();
    expect(formatBellBadge(0)).toBeNull();
    expect(formatBellBadge(-3)).toBeNull();
    expect(formatBellBadge(Number.NaN)).toBeNull();
  });

  it('shows the count up to 99, then caps at 99+', () => {
    expect(formatBellBadge(1)).toBe('1');
    expect(formatBellBadge(99)).toBe('99');
    expect(formatBellBadge(100)).toBe('99+');
    expect(formatBellBadge(4321)).toBe('99+');
  });
});
