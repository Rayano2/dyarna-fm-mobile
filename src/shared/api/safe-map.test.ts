import { describe, expect, it, vi, afterEach } from 'vitest';
import { safeMapList, setMapperReporter } from './safe-map';

afterEach(() => {
  setMapperReporter(null);
});

describe('safeMapList', () => {
  it('maps every item when none throw', () => {
    const out = safeMapList([1, 2, 3], (n) => (n as number) * 2, { feature: 'x', entity: 'n' });
    expect(out).toEqual([2, 4, 6]);
  });

  it('drops items whose mapper throws and continues', () => {
    const out = safeMapList(
      [1, 'bad', 3],
      (n) => {
        if (typeof n !== 'number') throw new Error('not a number');
        return n * 2;
      },
      { feature: 'x', entity: 'n' },
    );
    expect(out).toEqual([2, 6]);
  });

  it('reports per-item failures with index, raw, and context', () => {
    const onItemFailure = vi.fn();
    setMapperReporter({ onItemFailure });
    safeMapList(
      ['a', 'b'],
      (v) => {
        throw new Error(`bad-${String(v)}`);
      },
      { feature: 'community', entity: 'post' },
    );
    expect(onItemFailure).toHaveBeenCalledTimes(2);
    expect(onItemFailure).toHaveBeenNthCalledWith(1, {
      feature: 'community',
      entity: 'post',
      index: 0,
      raw: 'a',
      error: expect.any(Error),
    });
    expect(onItemFailure).toHaveBeenNthCalledWith(2, {
      feature: 'community',
      entity: 'post',
      index: 1,
      raw: 'b',
      error: expect.any(Error),
    });
  });

  it('emits an aggregate report only when items were dropped', () => {
    const onAggregate = vi.fn();
    setMapperReporter({ onAggregate });

    safeMapList([1, 2], Number, { feature: 'x', entity: 'n' });
    expect(onAggregate).not.toHaveBeenCalled();

    safeMapList(
      [1, 'bad', 3],
      (n) => {
        if (typeof n !== 'number') throw new Error('drop');
        return n;
      },
      { feature: 'x', entity: 'n' },
    );
    expect(onAggregate).toHaveBeenCalledTimes(1);
    expect(onAggregate).toHaveBeenCalledWith({
      feature: 'x',
      entity: 'n',
      total: 3,
      dropped: 1,
    });
  });

  it('falls back to default reporter when null is passed', () => {
    const onItemFailure = vi.fn();
    setMapperReporter({ onItemFailure });
    setMapperReporter(null);
    safeMapList(
      [1],
      () => {
        throw new Error('boom');
      },
      { feature: 'x', entity: 'y' },
    );
    expect(onItemFailure).not.toHaveBeenCalled();
  });
});
