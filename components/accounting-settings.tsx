'use client';

import { useMemo, useState } from 'react';

import { BusinessService, type AccountingSettings } from '../packages/business';

const BUSINESS_ID = 'business-001';
const AUTH_USER_ID = 'user-owner';

const defaultBusiness = {
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

const defaultPeriods = [
  {
    id: 'period-open-2026',
    businessId: BUSINESS_ID,
    name: '2026',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'OPEN' as const,
    closedAt: null,
    closedBy: null,
  },
  {
    id: 'period-closed-2025',
    businessId: BUSINESS_ID,
    name: '2025',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'CLOSED' as const,
    closedAt: '2026-01-02T00:00:00.000Z',
    closedBy: 'user-owner',
  },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function AccountingSettingsPage() {
  const service = useMemo(() => new BusinessService([defaultBusiness], defaultPeriods), []);
  const loadSettings = (): AccountingSettings =>
    service.getAccountingSettings({ businessId: BUSINESS_ID, userId: AUTH_USER_ID });

  const [settings, setSettings] = useState<AccountingSettings>(() => loadSettings());
  const [form, setForm] = useState({
    baseCurrency: settings.baseCurrency,
    fiscalYearStart: settings.fiscalYearStart ?? '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshSettings = () => {
    setIsLoading(true);
    setError(null);
    try {
      const next = loadSettings();
      setSettings(next);
      setForm({
        baseCurrency: next.baseCurrency,
        fiscalYearStart: next.fiscalYearStart ?? '',
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load accounting settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = service.updateAccountingSettings({
        businessId: BUSINESS_ID,
        userId: AUTH_USER_ID,
        baseCurrency: form.baseCurrency,
        fiscalYearStart: form.fiscalYearStart || null,
      });

      setSettings(updated);
      setForm({
        baseCurrency: updated.baseCurrency,
        fiscalYearStart: updated.fiscalYearStart ?? '',
      });
      setSuccess('Accounting settings saved successfully.');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to save accounting settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'Arial, sans-serif', padding: '1.5rem 1rem 2.5rem', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, color: '#475569', letterSpacing: '0.08em', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Settings</p>
            <h1 style={{ margin: '0.35rem 0 0', fontSize: 'clamp(2rem, 4vw, 2.5rem)' }}>Accounting Settings</h1>
          </div>
          <button type="button" onClick={refreshSettings} style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '0.7rem 1rem', cursor: 'pointer' }}>
            Reload settings
          </button>
        </header>

        {isLoading ? (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', color: '#475569' }}>
            Loading accounting settings…
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', borderRadius: 10, padding: '0.75rem' }}>
                {error}
              </div>
            )}
            {success && (
              <div role="status" style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 10, padding: '0.75rem' }}>
                {success}
              </div>
            )}

            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Base currency</span>
                  <input
                    value={form.baseCurrency}
                    onChange={(event) => setForm((current) => ({ ...current, baseCurrency: event.target.value.toUpperCase() }))}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}
                    placeholder="MYR"
                  />
                </label>

                <label style={{ display: 'grid', gap: '0.35rem' }}>
                  <span style={{ color: '#475569', fontSize: 12, fontWeight: 700 }}>Fiscal year start</span>
                  <input
                    type="date"
                    value={form.fiscalYearStart}
                    onChange={(event) => setForm((current) => ({ ...current, fiscalYearStart: event.target.value }))}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '0.7rem 0.8rem' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#475569', fontSize: 13 }}>
                  Last updated: {formatDate(settings.updatedAt)}
                </div>
                <button type="button" onClick={handleSave} disabled={isSaving} style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '0.8rem 1.2rem', fontWeight: 700, cursor: 'pointer', opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1.25rem', display: 'grid', gap: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Accounting periods</h2>
              </div>

              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {settings.periods.length === 0 ? (
                  <p style={{ margin: 0, color: '#475569' }}>No accounting periods are configured.</p>
                ) : (
                  settings.periods.map((period) => (
                    <div key={period.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '0.9rem 1rem', display: 'grid', gap: '0.35rem', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <strong>{period.name}</strong>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: 999, background: period.status === 'OPEN' ? '#ecfdf5' : '#f8fafc', color: period.status === 'OPEN' ? '#166534' : '#475569', fontSize: 12, fontWeight: 700 }}>
                          {period.status}
                        </span>
                      </div>
                      <div style={{ color: '#475569', fontSize: 14 }}>
                        {formatDate(period.startDate)} → {formatDate(period.endDate)}
                      </div>
                      {period.status === 'CLOSED' && (
                        <div style={{ color: '#64748b', fontSize: 12 }}>
                          Closed {period.closedAt ? formatDate(period.closedAt) : '—'}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
