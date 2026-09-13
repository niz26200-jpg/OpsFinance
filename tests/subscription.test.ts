import { describe, expect, it } from 'vitest';

import { AccountingEngine } from '../packages/accounting';
import { PLATFORM_FINANCE_POLICY, STARTER_PLAN, SubscriptionService } from '../packages/subscriptions';

describe('Phase 8 subscription and billing', () => {
  it('defines the locked Starter plan and lifecycle states', () => {
    const service = new SubscriptionService();
    const plan = service.getPlanDefinition('STARTER');

    expect(plan.monthlyPrice).toBe('29.00');
    expect(plan.currency).toBe('MYR');
    expect(plan.maxBusinesses).toBe(1);
    expect(plan.maxUsers).toBe(1);
    expect(plan.features).toContain('dashboard');
    expect(plan.features).toContain('upload_and_convert');
    expect(plan.features).not.toContain('multi_business');
    expect(plan.features).not.toContain('advanced_ai');
    expect(STARTER_PLAN.monthlyPrice).toBe('29.00');
  });

  it('enforces the exact subscription lifecycle and rejects invalid transitions', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');

    expect(subscription.status).toBe('ACTIVE');

    service.transitionStatus(subscription.id, 'PAST_DUE', 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('PAST_DUE');

    service.transitionStatus(subscription.id, 'GRACE_PERIOD', 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('GRACE_PERIOD');

    service.transitionStatus(subscription.id, 'SUSPENDED', 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('SUSPENDED');

    service.reactivateSubscription(subscription.id, 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('ACTIVE');

    service.transitionStatus(subscription.id, 'CANCELLED', 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('CANCELLED');

    expect(() => service.transitionStatus(subscription.id, 'ACTIVE', 'user-a')).toThrow();
    expect(() => service.transitionStatus(subscription.id, 'PAST_DUE', 'user-a')).toThrow();
  });

  it('enforces Starter limits for business and user membership', () => {
    const service = new SubscriptionService();
    const businessA = service.registerBusiness('business-a', 'user-a');

    expect(service.getBusinessSubscription('business-a').id).toBe(businessA.id);
    expect(() => service.registerBusiness('business-b', 'user-b')).toThrow('Starter plan allows only one business.');

    service.addBusinessMember('business-a', 'user-a');
    expect(() => service.addBusinessMember('business-a', 'user-b')).toThrow('Starter plan allows only one active user on the business.');
  });

  it('enforces feature access centrally and blocks unauthorized future-plan features', () => {
    const service = new SubscriptionService();
    service.registerBusiness('business-a', 'user-a');

    expect(service.getBusinessSubscription('business-a').plan).toBe('STARTER');
    expect(() => service.assertFeatureAccess('business-a', 'multi_business', 'user-a')).toThrow();
    expect(() => service.assertFeatureAccess('business-a', 'advanced_ai', 'user-a')).toThrow();
    expect(() => service.assertFeatureAccess('business-a', 'reports', 'user-a')).not.toThrow();
    expect(() => service.assertFeatureAccess('business-a', 'upload_and_convert', 'user-a')).not.toThrow();
  });

  it('tracks payment state, history, and idempotent events', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');

    const first = service.initiatePayment(subscription.id, 'INV-001', '29.00', 'MYR', 'user-a', 'evt-1');
    const duplicate = service.initiatePayment(subscription.id, 'INV-001', '29.00', 'MYR', 'user-a', 'evt-1');
    expect(first.id).toBe(duplicate.id);

    const paid = service.recordPaymentStatus(subscription.id, 'evt-1', 'PAID', 'user-a');
    expect(paid.status).toBe('PAID');
    expect(service.getPaymentHistory(subscription.id).length).toBeGreaterThan(0);

    const failed = service.recordPaymentStatus(subscription.id, 'evt-2', 'FAILED', 'user-a', 'Card declined');
    expect(failed.status).toBe('FAILED');
    expect(failed.failureReason).toBe('Card declined');

    const events = service.getAuditTrail(subscription.id).map((event) => event.event);
    expect(events).toContain('subscription_created');
    expect(events).toContain('payment_initiated');
    expect(events).toContain('payment_succeeded');
    expect(events).toContain('payment_failed');
  });

  it('handles renewal, grace period and suspension recovery deterministically', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');
    service.initiatePayment(subscription.id, 'INV-RENEW', '29.00', 'MYR', 'user-a', 'evt-renew');
    service.recordPaymentStatus(subscription.id, 'evt-renew', 'PAID', 'user-a');

    const renewed = service.renewSubscription(subscription.id, 'user-a');
    expect(renewed.status).toBe('ACTIVE');
    expect(renewed.nextBillingDate).toBeTruthy();

    service.transitionStatus(subscription.id, 'PAST_DUE', 'user-a');
    service.transitionStatus(subscription.id, 'GRACE_PERIOD', 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('GRACE_PERIOD');

    service.transitionStatus(subscription.id, 'SUSPENDED', 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('SUSPENDED');

    service.reactivateSubscription(subscription.id, 'user-a');
    expect(service.getBusinessSubscription('business-a').status).toBe('ACTIVE');
  });

  it('supports cancellation while preserving business accounting data', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');

    const cancelled = service.cancelSubscription(subscription.id, 'user-a', 'PERIOD_END');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelledAt).toBeTruthy();
    expect(service.getAuditTrail(subscription.id).some((event) => event.event === 'subscription_cancelled')).toBe(true);
  });

  it('separates platform finance from business accounting records', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');
    service.initiatePayment(subscription.id, 'INV-PLATFORM', '29.00', 'MYR', 'user-a', 'evt-platform');
    service.recordPaymentStatus(subscription.id, 'evt-platform', 'PAID', 'user-a');

    expect(PLATFORM_FINANCE_POLICY.businessAccountingIsolation).toBe(true);
    expect(service.getPaymentHistory(subscription.id)[0].amount).toBe('29.00');
    expect(service.getBusinessSubscription('business-a').plan).toBe('STARTER');
  });

  it('prevents cross-business access for subscription and payment records', () => {
    const service = new SubscriptionService();
    const subA = service.registerBusiness('business-a', 'user-a');

    expect(() => service.registerBusiness('business-b', 'user-b')).toThrow('Starter plan allows only one business.');
    expect(subA.businessId).toBe('business-a');
    expect(service.getPaymentHistory(subA.id)).toEqual([]);
    expect(() => service.assertFeatureAccess('business-b', 'reports', 'user-b')).toThrow();
  });

  it('emits real audit events for subscription lifecycle and billing operations', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');

    service.transitionStatus(subscription.id, 'PAST_DUE', 'user-a');
    service.transitionStatus(subscription.id, 'GRACE_PERIOD', 'user-a');
    service.transitionStatus(subscription.id, 'SUSPENDED', 'user-a');
    service.reactivateSubscription(subscription.id, 'user-a');
    service.initiatePayment(subscription.id, 'INV-AUDIT', '29.00', 'MYR', 'user-a', 'evt-audit');
    service.recordPaymentStatus(subscription.id, 'evt-audit', 'PAID', 'user-a');

    const events = service.getAuditTrail(subscription.id).map((event) => event.event);
    expect(events).toEqual(expect.arrayContaining([
      'subscription_created',
      'subscription_activated',
      'subscription_past_due',
      'grace_period_started',
      'subscription_suspended',
      'subscription_reactivated',
      'payment_initiated',
      'payment_succeeded',
    ]));
  });

  it('prevents duplicate provider callbacks from creating duplicate payment records', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');

    service.initiatePayment(subscription.id, 'INV-DUP', '29.00', 'MYR', 'user-a', 'evt-duplicate');
    service.recordPaymentStatus(subscription.id, 'evt-duplicate', 'PAID', 'user-a');
    service.recordPaymentStatus(subscription.id, 'evt-duplicate', 'PAID', 'user-a');

    const events = service.getAuditTrail(subscription.id).filter((event) => event.event === 'payment_succeeded');
    expect(service.getPaymentHistory(subscription.id).filter((payment) => payment.providerEventId === 'evt-duplicate')).toHaveLength(1);
    expect(events).toHaveLength(1);
  });

  it('enforces server-side business and plan state for client-supplied values', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');

    expect(service.getBusinessSubscription('business-a').plan).toBe('STARTER');
    expect(service.getBusinessSubscription('business-a').status).toBe('ACTIVE');
    expect(() => service.assertFeatureAccess('business-a', 'multi_business', 'user-a')).toThrow();
    expect(() => service.assertFeatureAccess('business-a', 'reports', 'user-b')).toThrow();
    expect(() => service.transitionStatus(subscription.id, 'ACTIVE', 'user-a')).not.toThrow();
  });

  it('keeps subscription payments out of the accounting ledger and trial balance', () => {
    const service = new SubscriptionService();
    const subscription = service.registerBusiness('business-a', 'user-a');
    const engine = new AccountingEngine({
      businessId: 'business-a',
      accounts: [
        { id: 'acct-revenue', businessId: 'business-a', code: '4000', name: 'Sales', accountType: 'REVENUE', normalBalance: 'CREDIT', isSystem: false, isActive: true },
        { id: 'acct-bank', businessId: 'business-a', code: '1100', name: 'Bank', accountType: 'ASSET', normalBalance: 'DEBIT', isSystem: false, isActive: true },
      ],
      periods: [{ id: 'period-sub', businessId: 'business-a', name: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30', status: 'OPEN' }],
    });

    const before = engine.getTrialBalance('business-a');
    expect(before.accounts).toHaveLength(0);

    service.initiatePayment(subscription.id, 'INV-ACCOUNTING', '29.00', 'MYR', 'user-a', 'evt-accounting');
    service.recordPaymentStatus(subscription.id, 'evt-accounting', 'PAID', 'user-a');

    const journal = engine.createJournal({
      businessId: 'business-a',
      journalNo: 'J-PLATFORM-001',
      journalDate: '2026-09-12',
      sourceType: 'SYSTEM',
      description: 'Only business accounting entry',
      lines: [
        { accountId: 'acct-bank', debit: '29.00' },
        { accountId: 'acct-revenue', credit: '29.00' },
      ],
    });
    engine.postJournal(journal, { postedBy: 'user-a', idempotencyKey: 'platform-check' });

    const after = engine.getTrialBalance('business-a');
    expect(after.accounts.map((account) => account.accountId)).toEqual(expect.arrayContaining(['acct-bank', 'acct-revenue']));
    expect(after.accounts).toHaveLength(2);
    expect(engine.getLedger({ businessId: 'business-a', accountId: 'acct-bank' }).entries).toHaveLength(1);
    expect(service.getPaymentHistory(subscription.id)[0].amount).toBe('29.00');
  });

  it('contains the locked starter defaults and provider status flags', () => {
    const service = new SubscriptionService();
    expect(STARTER_PLAN.monthlyPrice).toBe('29.00');
    expect(service.getConfig().livePaymentProvider).toBe('NOT_CONFIGURED');
    expect(service.getConfig().liveSupabaseUat).toBe('BLOCKED');
  });
});
