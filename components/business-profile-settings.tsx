'use client';

import { useMemo, useState } from 'react';

import { BusinessService, type UpdateBusinessProfileInput } from '../packages/business';
import type { Business } from '../packages/types';

const BUSINESS_ID = 'business-001';
const AUTH_USER_ID = 'user-owner';

const defaultBusiness: Business = {
  id: BUSINESS_ID,
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

export function BusinessProfileSettings() {
  const service = useMemo(() => {
    const next = new BusinessService([defaultBusiness]);
    return next;
  }, []);

  const [business, setBusiness] = useState<Business>(() => service.getBusinessProfile({ businessId: BUSINESS_ID, userId: AUTH_USER_ID }));
  const [form, setForm] = useState({
    name: business.name,
    registrationNo: business.registrationNo ?? '',
    address: business.address ?? '',
    phone: business.phone ?? '',
    email: business.email ?? '',
    baseCurrency: business.baseCurrency,
    fiscalYearStart: business.fiscalYearStart ?? '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadProfile = () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = service.getBusinessProfile({ businessId: BUSINESS_ID, userId: AUTH_USER_ID });
      setBusiness(profile);
      setForm({
        name: profile.name,
        registrationNo: profile.registrationNo ?? '',
        address: profile.address ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
        baseCurrency: profile.baseCurrency,
        fiscalYearStart: profile.fiscalYearStart ?? '',
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: UpdateBusinessProfileInput = {
        businessId: BUSINESS_ID,
        userId: AUTH_USER_ID,
        name: form.name,
        registrationNo: form.registrationNo || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        baseCurrency: form.baseCurrency,
        fiscalYearStart: form.fiscalYearStart || null,
      };

      const updated = service.updateBusinessProfile(payload);
      setBusiness(updated);
      setForm({
        name: updated.name,
        registrationNo: updated.registrationNo ?? '',
        address: updated.address ?? '',
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        baseCurrency: updated.baseCurrency,
        fiscalYearStart: updated.fiscalYearStart ?? '',
      });
      setSuccess('Business profile saved successfully.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save the business profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '1.5rem 1rem 2.5rem' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Settings</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>Business Profile</h1>
          </div>
          <button type="button" onClick={loadProfile} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '0.7rem 1rem', cursor: 'pointer' }}>Reload profile</button>
        </header>

        {isLoading ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', color: '#475569' }}>Loading business profile…</div>
        ) : (
          <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
            {error && (
              <div role="alert" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 10, padding: '0.75rem' }}>{error}</div>
            )}
            {success && (
              <div role="status" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '0.75rem' }}>{success}</div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Business name</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Registration no.</span>
                <input value={form.registrationNo} onChange={(event) => setForm((current) => ({ ...current, registrationNo: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Base currency</span>
                <input value={form.baseCurrency} onChange={(event) => setForm((current) => ({ ...current, baseCurrency: event.target.value.toUpperCase() }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Fiscal year start</span>
                <input type="date" value={form.fiscalYearStart} onChange={(event) => setForm((current) => ({ ...current, fiscalYearStart: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', gridColumn: '1 / -1' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Address</span>
                <textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={4} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem', resize: 'vertical', minHeight: 80 }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Phone</span>
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem' }}>
                <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Business email</span>
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: '#475569', fontSize: 13 }}>
                Last updated: {new Date(business.updatedAt).toLocaleString()}
              </div>
              <button type="button" onClick={handleSave} disabled={isSaving} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
