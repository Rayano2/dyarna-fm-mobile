import { describe, expect, it } from 'vitest';
import en from '@/shared/i18n/translations/en.json';
import type { DashboardInfo } from '../api/dashboard-api';
import { greetingKey, KPI_ORDER, kpiDestination, kpiTile, kpiValue } from './kpis';
import { priorityBadge, priorityLabel, statusBadge, statusLabel } from './badge-tone';

const fakeT = (key: string): string => `t:${key}`;

const INFO: DashboardInfo = {
  openMaintenanceTicketsCount: 7,
  pendingResidentRequestsCount: 3,
  activeUnitsCount: 120,
  topOpenTickets: [],
};

function hasKey(key: string): boolean {
  let node: unknown = en;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object' || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string';
}

describe('KPI -> route mapping', () => {
  it('tabs are navigated to, More screens are pushed', () => {
    expect(kpiDestination('openTickets')).toEqual({ href: '/tickets', method: 'navigate' });
    expect(kpiDestination('pendingRequests')).toEqual({ href: '/requests', method: 'navigate' });
    expect(kpiDestination('activeProperties')).toEqual({ href: '/properties', method: 'push' });
    expect(kpiDestination('myTasks')).toEqual({ href: '/todos', method: 'push' });
  });

  it('renders the four tiles in web order with real i18n keys', () => {
    expect(KPI_ORDER).toEqual(['openTickets', 'pendingRequests', 'activeProperties', 'myTasks']);
    for (const kind of KPI_ORDER) {
      const tile = kpiTile(kind);
      expect(hasKey(tile.labelKey), tile.labelKey).toBe(true);
      expect(hasKey(tile.descKey), tile.descKey).toBe(true);
    }
  });
});

describe('kpiValue', () => {
  it('reads each DTO count', () => {
    expect(kpiValue('openTickets', INFO, 2)).toBe(7);
    expect(kpiValue('pendingRequests', INFO, 2)).toBe(3);
    expect(kpiValue('activeProperties', INFO, 2)).toBe(120);
    expect(kpiValue('myTasks', INFO, 2)).toBe(2);
  });

  it('a failed todos query only blanks My tasks', () => {
    expect(kpiValue('myTasks', INFO)).toBeNull();
    expect(kpiValue('openTickets', INFO)).toBe(7);
  });
});

describe('greetingKey', () => {
  it('switches at 12:00 and 18:00', () => {
    expect(greetingKey(0)).toBe('fm.dashboard.greetingMorning');
    expect(greetingKey(11)).toBe('fm.dashboard.greetingMorning');
    expect(greetingKey(12)).toBe('fm.dashboard.greetingAfternoon');
    expect(greetingKey(17)).toBe('fm.dashboard.greetingAfternoon');
    expect(greetingKey(18)).toBe('fm.dashboard.greetingEvening');
  });
});

describe('badge-tone', () => {
  it('maps known codes to a tone and an existing key; unknown codes stay neutral', () => {
    expect(statusBadge('OPEN')).toEqual({ tone: 'info', labelKey: 'fm.dashboard.status.OPEN' });
    expect(priorityBadge('urgent')).toEqual({
      tone: 'danger',
      labelKey: 'fm.dashboard.priority.URGENT',
    });
    expect(statusBadge('WHATEVER')).toEqual({ tone: 'neutral', labelKey: null });
    for (const code of ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED']) {
      expect(hasKey(statusBadge(code).labelKey ?? ''), code).toBe(true);
    }
    for (const code of ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'EMERGENCY']) {
      expect(hasKey(priorityBadge(code).labelKey ?? ''), code).toBe(true);
    }
  });
});

describe('status/priority labels (bms-tms V6 lookup codes)', () => {
  const names = { statusNameAr: 'قيد المراجعة', statusNameEn: 'Under review' };

  it('knows ON_HOLD, CANCELLED and CRITICAL, with en keys', () => {
    expect(statusBadge('ON_HOLD')).toEqual({
      tone: 'goldMuted',
      labelKey: 'fm.dashboard.status.ON_HOLD',
    });
    expect(statusBadge('CANCELLED').labelKey).toBe('fm.dashboard.status.CANCELLED');
    expect(priorityBadge('CRITICAL')).toEqual({
      tone: 'danger',
      labelKey: 'fm.dashboard.priority.CRITICAL',
    });
    for (const key of [
      'fm.dashboard.status.ON_HOLD',
      'fm.dashboard.status.CANCELLED',
      'fm.dashboard.priority.CRITICAL',
      'fm.dashboard.kpi.unavailable',
    ]) {
      expect(hasKey(key), key).toBe(true);
    }
  });

  it('a known status uses our key, not the server name', () => {
    expect(statusLabel('ON_HOLD', names, fakeT, false)).toBe('t:fm.dashboard.status.ON_HOLD');
  });

  it('an unknown status falls back to the DTO name for the locale, then the other, then the code', () => {
    expect(statusLabel('UNDER_REVIEW', names, fakeT, false)).toBe('Under review');
    expect(statusLabel('UNDER_REVIEW', names, fakeT, true)).toBe('قيد المراجعة');
    expect(
      statusLabel('UNDER_REVIEW', { statusNameAr: '', statusNameEn: 'Under review' }, fakeT, true),
    ).toBe('Under review');
    expect(statusLabel('UNDER_REVIEW', { statusNameAr: '', statusNameEn: '' }, fakeT, false)).toBe(
      'UNDER_REVIEW',
    );
  });

  it('an unknown priority falls back to the raw code', () => {
    expect(priorityLabel('CRITICAL', fakeT)).toBe('t:fm.dashboard.priority.CRITICAL');
    expect(priorityLabel('P0', fakeT)).toBe('P0');
  });
});
