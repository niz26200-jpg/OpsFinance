import { describe, expect, it } from 'vitest';

import { BusinessService } from '../packages/business';

const sampleBusiness = {
  id: 'business-001',
  name: 'OpsFinance Malaysia',
  registrationNo: 'M2012345678',
  address: 'Kuala Lumpur, Malaysia',
  phone: '+603-1234 5678',
  email: 'hello@opsfinance.local',
  baseCurrency: 'MYR',
  fiscalYearStart: '2026-01-01',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
};

const openPeriod = {
  id: 'period-open-2026',
  businessId: sampleBusiness.id,
  name: '2026',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'OPEN' as const,
  closedAt: null,
  closedBy: null,
};

const closedPeriod = {
  id: 'period-closed-2025',
  businessId: sampleBusiness.id,
  name: '2025',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  status: 'CLOSED' as const,
  closedAt: '2026-01-02T00:00:00.000Z',
  closedBy: 'user-owner',
};

describe('accounting settings service', () => {
  it('loads the current accounting settings and lists open and closed periods', () => {
    const service = new BusinessService([sampleBusiness], [openPeriod, closedPeriod]);

    const settings = service.getAccountingSettings({ businessId: sampleBusiness.id, userId: 'owner-user' });

    expect(settings.baseCurrency).toBe('MYR');
    expect(settings.fiscalYearStart).toBe('2026-01-01');
    expect(settings.openPeriods).toHaveLength(1);
    expect(settings.closedPeriods).toHaveLength(1);
    expect(settings.closedPeriods[0].status).toBe('CLOSED');
  });

  it('updates the supported settings without touching closed periods', () => {
    const service = new BusinessService([sampleBusiness], [openPeriod, closedPeriod]);

    const updated = service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      baseCurrency: 'USD',
      fiscalYearStart: '2026-03-01',
    });

    expect(updated.baseCurrency).toBe('USD');
    expect(updated.fiscalYearStart).toBe('2026-03-01');
    expect(updated.updatedAt).toBeTruthy();
  });

  it('validates base currency and fiscal year start before saving', () => {
    const service = new BusinessService([sampleBusiness], [openPeriod, closedPeriod]);

    expect(() => service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      baseCurrency: 'US',
    })).toThrow('Base currency must be a valid 3-letter ISO code.');

    expect(() => service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      fiscalYearStart: '2026-13-01',
    })).toThrow('Fiscal year start must be a valid date.');
  });

  it('prevents modification of closed accounting periods', () => {
    const service = new BusinessService([sampleBusiness], [openPeriod, closedPeriod]);

    expect(() => service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      periods: [{ id: closedPeriod.id, status: 'OPEN' }],
    })).toThrow('Closed accounting periods cannot be modified.');
  });

  it('enforces business isolation and authorization', () => {
    const service = new BusinessService([sampleBusiness], [openPeriod, closedPeriod]);

    expect(() => service.getAccountingSettings({ businessId: 'other-business', userId: 'owner-user' })).toThrow('Business access denied.');
    expect(() => service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'other-user',
      baseCurrency: 'SGD',
    })).toThrow('Business access denied.');
  });

  it('refuses to silently change a business away from historical currencies', () => {
    const service = new BusinessService(
      [sampleBusiness],
      [openPeriod, closedPeriod],
      { [sampleBusiness.id]: ['MYR', 'USD'] },
    );

    expect(() => service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      baseCurrency: 'SGD',
    })).toThrow('Base currency change is unsafe because historical transaction currencies exist.');
  });

  it('returns useful errors when save fails', () => {
    const service = new BusinessService([sampleBusiness], [openPeriod, closedPeriod]);

    expect(() => service.updateAccountingSettings({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      baseCurrency: 'US',
    })).toThrow('Base currency must be a valid 3-letter ISO code.');
  });
});
