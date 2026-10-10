import { describe, expect, it } from 'vitest';
import { firstIssues } from '../../scope/lib/zod-resolver';
import { addUnitSchema, EMPTY_ADD_UNIT } from './add-unit-schema';

describe('addUnitSchema', () => {
  it('trims the unit number and parses the floor', () => {
    expect(addUnitSchema.parse({ unitNumber: ' 101 ', floorNumber: ' 3 ' })).toEqual({
      unitNumber: '101',
      floorNumber: 3,
    });
  });

  it('accepts both ends of the floor range', () => {
    expect(addUnitSchema.parse({ unitNumber: 'A', floorNumber: '0' }).floorNumber).toBe(0);
    expect(addUnitSchema.parse({ unitNumber: 'A', floorNumber: '10' }).floorNumber).toBe(10);
  });

  it('accepts Arabic-Indic digits and sends ASCII', () => {
    expect(addUnitSchema.parse({ unitNumber: '١٠٢', floorNumber: '٣' })).toEqual({
      unitNumber: '102',
      floorNumber: 3,
    });
    expect(addUnitSchema.parse({ unitNumber: 'A', floorNumber: '١٠' }).floorNumber).toBe(10);
  });

  it('accepts Persian (Extended Arabic-Indic) digits', () => {
    expect(addUnitSchema.parse({ unitNumber: '۲۰۱', floorNumber: '۷' })).toEqual({
      unitNumber: '201',
      floorNumber: 7,
    });
  });

  it('still rejects an out-of-range Arabic floor', () => {
    expect(addUnitSchema.safeParse({ unitNumber: 'A', floorNumber: '١١' }).success).toBe(false);
  });

  it('requires a unit number', () => {
    const result = addUnitSchema.safeParse({ unitNumber: '   ', floorNumber: '1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssues(result.error)).toEqual({ unitNumber: 'fm.properties.unitNumberRequired' });
    }
  });

  it.each(['11', '-1', '', '1.5', 'abc'])('rejects floor %j', (floorNumber) => {
    const result = addUnitSchema.safeParse({ unitNumber: 'A', floorNumber });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssues(result.error)).toEqual({ floorNumber: 'fm.properties.floorRange' });
    }
  });

  it('the empty form fails only on the unit number', () => {
    const result = addUnitSchema.safeParse(EMPTY_ADD_UNIT);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(firstIssues(result.error))).toEqual(['unitNumber']);
    }
  });
});
