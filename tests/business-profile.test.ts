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

describe('business profile service', () => {
  it('loads an authorized business profile', () => {
    const service = new BusinessService([sampleBusiness]);
    const profile = service.getBusinessProfile({ businessId: sampleBusiness.id, userId: 'owner-user' });

    expect(profile.name).toBe('OpsFinance Malaysia');
    expect(profile.baseCurrency).toBe('MYR');
  });

  it('updates supported business fields', () => {
    const service = new BusinessService([sampleBusiness]);
    const updated = service.updateBusinessProfile({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      name: 'OpsFinance Sdn Bhd',
      phone: '+603 5555 1234',
      address: 'Petaling Jaya, Malaysia',
    });

    expect(updated.name).toBe('OpsFinance Sdn Bhd');
    expect(updated.phone).toBe('+603 5555 1234');
    expect(updated.address).toBe('Petaling Jaya, Malaysia');
  });

  it('validates business profile inputs', () => {
    const service = new BusinessService([sampleBusiness]);
    expect(() => service.updateBusinessProfile({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      name: '',
    })).toThrow('Business name is required');

    expect(() => service.updateBusinessProfile({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      email: 'bad-email',
    })).toThrow('Business email is invalid');
  });

  it('enforces business isolation', () => {
    const service = new BusinessService([sampleBusiness]);
    expect(() => service.getBusinessProfile({ businessId: 'other-business', userId: 'owner-user' })).toThrow('Business access denied');
  });

  it('forbids unauthorized updates', () => {
    const service = new BusinessService([sampleBusiness]);
    expect(() => service.updateBusinessProfile({
      businessId: sampleBusiness.id,
      userId: 'other-user',
      name: 'Nope',
    })).toThrow('Business access denied');
  });

  it('reports a successful save path', () => {
    const service = new BusinessService([sampleBusiness]);
    const result = service.updateBusinessProfile({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      name: 'Updated Business',
      baseCurrency: 'USD',
    });

    expect(result.name).toBe('Updated Business');
    expect(result.baseCurrency).toBe('USD');
  });

  it('returns a useful error on failed save', () => {
    const service = new BusinessService([sampleBusiness]);
    expect(() => service.updateBusinessProfile({
      businessId: sampleBusiness.id,
      userId: 'owner-user',
      email: 'invalid',
    })).toThrow('Business email is invalid');
  });
});
