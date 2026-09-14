export interface RepositoryError extends Error {
  code?: string;
}

export interface AccountRepository<T> {
  listByBusiness(businessId: string): T[];
  getById(businessId: string, id: string): T;
  create(input: T): T;
  update(id: string, patch: Partial<T>): T;
}

export interface FinancialAccountRepository<T> extends AccountRepository<T> {
  listByBusiness(businessId: string): T[];
}

export class LocalAccountRepository<T extends { businessId: string; id: string }> implements AccountRepository<T> {
  private readonly store = new Map<string, T>();

  listByBusiness(businessId: string): T[] {
    return [...this.store.values()].filter((entry) => entry.businessId === businessId);
  }

  getById(businessId: string, id: string): T {
    const item = this.store.get(id);
    if (!item || item.businessId !== businessId) {
      throw Object.assign(new Error('Account not found for this business.'), { code: 'NOT_FOUND' });
    }
    return item;
  }

  create(input: T): T {
    this.store.set(input.id, input);
    return input;
  }

  update(id: string, patch: Partial<T>): T {
    const existing = this.store.get(id);
    if (!existing) {
      throw Object.assign(new Error('Account record not found.'), { code: 'NOT_FOUND' });
    }
    const updated = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }
}

export class LocalFinancialAccountRepository<T extends { businessId: string; id: string }> extends LocalAccountRepository<T> implements FinancialAccountRepository<T> {}
