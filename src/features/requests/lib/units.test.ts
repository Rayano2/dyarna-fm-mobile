import { describe, expect, it } from 'vitest';
import type { BuildingUnit } from '../api/mappers';
import { unitOccupancy } from '@/shared/lib/unit-occupancy';
import { reconcileSelection, summarizeUnits } from './units';

function unit(unitNumber: string, occupantCount: number, residentFullName?: string): BuildingUnit {
  return { propertyUnitId: 1, unitNumber, occupantCount, residentFullName };
}

describe('unitOccupancy', () => {
  it('a vacant unit is selectable', () => {
    expect(unitOccupancy(unit('1', 0))).toEqual({
      occupied: false,
      selectable: true,
      extraOccupants: 0,
    });
  });

  it('an occupied unit is disabled', () => {
    expect(unitOccupancy(unit('1', 1, 'Omar'))).toEqual({
      occupied: true,
      selectable: false,
      extraOccupants: 0,
    });
  });

  it('a named resident means occupied even when occupantCount is missing (older BMS)', () => {
    expect(unitOccupancy(unit('1', 0, 'Omar'))).toMatchObject({
      occupied: true,
      selectable: false,
    });
  });

  it('counts the occupants beyond the named one as "+n"', () => {
    expect(unitOccupancy(unit('1', 3, 'Omar')).extraOccupants).toBe(2);
  });
});

describe('summarizeUnits', () => {
  it('distinguishes none / all occupied / some occupied / all vacant', () => {
    expect(summarizeUnits([])).toBe('none');
    expect(summarizeUnits([unit('1', 1), unit('2', 2)])).toBe('allOccupied');
    expect(summarizeUnits([unit('1', 1), unit('2', 0)])).toBe('someOccupied');
    expect(summarizeUnits([unit('1', 0)])).toBe('allVacant');
  });
});

describe('reconcileSelection', () => {
  it('drops a selection that is now occupied or gone, keeps a vacant one', () => {
    const units = [unit('1', 1), unit('2', 0)];
    expect(reconcileSelection('1', units)).toBeNull();
    expect(reconcileSelection('9', units)).toBeNull();
    expect(reconcileSelection('2', units)).toBe('2');
    expect(reconcileSelection(null, units)).toBeNull();
  });
});
