import { describe, expect, it } from 'vitest';
import en from '@/shared/i18n/translations/en.json';
import type { DashboardInfo } from '../api/dashboard-api';
import { greetingKey, KPI_ORDER, kpiDestination, kpiTile, kpiValue } from './kpis';
import { fmTicketDestination } from '@/shared/lib/fm-routes';

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

describe('fmTicketDestination (recent rows + notifications)', () => {
  it('pushes the ticket detail by number, encoded', () => {
    expect(fmTicketDestination('725')).toEqual({ href: '/tickets/725', method: 'push' });
    expect(fmTicketDestination('TKT 1/2')).toEqual({
      href: '/tickets/TKT%201%2F2',
      method: 'push',
    });
  });

  it('falls back to the Tickets tab without a number', () => {
    expect(fmTicketDestination('')).toEqual({ href: '/tickets', method: 'navigate' });
    expect(fmTicketDestination('  ')).toEqual({ href: '/tickets', method: 'navigate' });
    expect(fmTicketDestination()).toEqual({ href: '/tickets', method: 'navigate' });
  });

  it('the unavailable KPI label exists', () => {
    expect(hasKey('fm.dashboard.kpi.unavailable')).toBe(true);
  });
});
