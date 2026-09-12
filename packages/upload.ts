import { AccountingEngine, DecimalMoney } from './accounting';
import { TransactionService } from './transactions';

export type UploadType = 'BANK_STATEMENT' | 'PDF' | 'CSV' | 'EXCEL' | 'RECEIPT' | 'INVOICE';
export type ExtractionStatus = 'IMPORTED' | 'PARSED' | 'REVIEW' | 'MAPPED' | 'APPROVED' | 'POSTED' | 'RECONCILED';
export type DuplicateStatus = 'NONE' | 'POSSIBLE_DUPLICATE' | 'CONFIRMED_DUPLICATE';
export type TransactionSuggestionType = 'MONEY_IN' | 'MONEY_OUT' | 'TRANSFER' | 'JOURNAL';

export interface UploadFile {
  name: string;
  size: number;
  type: string;
  content?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  message?: string;
}

export interface NormalizedRow {
  originalDate?: string;
  date: string;
  description: string;
  reference?: string;
  amount: string;
  rawAmount?: string;
  direction: 'DEBIT' | 'CREDIT';
  balance?: string;
  currency: string;
}

export interface CandidateSuggestion {
  type: TransactionSuggestionType;
  financialAccountId?: string;
  accountId?: string;
  amount: string;
  description: string;
  referenceNo?: string;
  date: string;
}

export interface UploadCandidate {
  id: string;
  businessId: string;
  source: UploadType;
  raw: Record<string, string | undefined>;
  normalized: NormalizedRow;
  duplicateStatus: DuplicateStatus;
  status: ExtractionStatus;
  suggestion: CandidateSuggestion;
  confidence: number;
  auditTrail?: string[];
}

export interface ImportBatch {
  id: string;
  businessId: string;
  fileName: string;
  source: UploadType;
  uploadedBy: string;
  uploadedAt: string;
  status: 'UPLOADED' | 'PARSING' | 'REVIEW' | 'APPROVED' | 'POSTED';
  candidates: UploadCandidate[];
  errors: Array<{ row?: string; error: string; action: string }>;
}

export class UploadConvertService {
  private readonly engine: AccountingEngine;
  private readonly batches = new Map<string, ImportBatch>();
  private readonly idempotency = new Map<string, string>();

  constructor(engine: AccountingEngine) {
    this.engine = engine;
  }

  validateFile(file: UploadFile): ValidationResult {
    const allowedTypes = new Map([
      ['text/csv', 'csv'],
      ['application/csv', 'csv'],
      ['application/vnd.ms-excel', 'csv'],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
      ['application/vnd.ms-excel.sheet.macroenabled.12', 'xls'],
      ['application/pdf', 'pdf'],
      ['image/png', 'png'],
      ['image/jpeg', 'jpg'],
    ]);

    const errors: string[] = [];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['csv', 'xls', 'xlsx', 'pdf', 'png', 'jpg', 'jpeg'];

    if (!file.name || !extension || !allowedExtensions.includes(extension)) {
      errors.push('Unsupported file format.');
    }

    if (!allowedTypes.has(file.type) && extension && !['csv', 'xlsx', 'xls', 'pdf', 'png', 'jpg', 'jpeg'].includes(extension)) {
      errors.push('MIME type does not match the file extension.');
    }

    if (file.size <= 0) {
      errors.push('File is empty.');
    }

    if (file.size > 10 * 1024 * 1024) {
      errors.push('File exceeds the 10 MB upload limit.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'File validated.' : 'Upload rejected.',
    };
  }

  processBankStatementCsv(csvText: string, fileName: string, businessId: string, uploadedBy: string): ImportBatch {
    const validation = this.validateFile({ name: fileName, size: csvText.length, type: 'text/csv' });
    if (!validation.isValid) {
      const batch: ImportBatch = {
        id: `batch-${Date.now()}`,
        businessId,
        fileName,
        source: 'BANK_STATEMENT',
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        status: 'REVIEW',
        candidates: [],
        errors: [{ error: validation.errors.join(' '), action: 'REJECT' }],
      };
      this.batches.set(batch.id, batch);
      return batch;
    }

    const rows = csvText.split(/\r?\n/).filter((row) => row.trim().length > 0);
    if (rows.length < 2) {
      const batch: ImportBatch = {
        id: `batch-${Date.now()}`,
        businessId,
        fileName,
        source: 'BANK_STATEMENT',
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        status: 'REVIEW',
        candidates: [],
        errors: [{ error: 'CSV file does not contain transaction rows.', action: 'REJECT' }],
      };
      this.batches.set(batch.id, batch);
      return batch;
    }

    const header = this.parseCsvRow(rows[0]);
    const normalizedRows: NormalizedRow[] = [];
    const errors: Array<{ row?: string; error: string; action: string }> = [];

    for (const [index, rowText] of rows.slice(1).entries()) {
      const row = this.parseCsvRow(rowText);
      const record = Object.fromEntries(header.map((key, i) => [key.toLowerCase(), row[i] ?? '']));
      const debit = this.firstNonEmptyString(record.debit, record.amount, '');
      const credit = this.firstNonEmptyString(record.credit, '', '');
      const date = this.normalizeDate(record.date ?? record.transactiondate ?? '');
      const rawAmount = this.firstNonEmptyString(debit, credit, record.amount, '0');
      const direction = this.detectDirection(rawAmount, debit, credit);
      const amount = this.normalizeAmount(rawAmount);

      if (!date || amount === '0.00') {
        errors.push({ row: `Row ${index + 2}`, error: 'Malformed or empty transaction row.', action: 'REVIEW' });
        continue;
      }

      normalizedRows.push({
        originalDate: record.date ?? record.transactiondate,
        date,
        description: this.normalizeDescription(String(record.description ?? record.narration ?? 'Bank transaction')),
        reference: this.normalizeReference(String(record.reference ?? record.description ?? '')),
        amount,
        rawAmount,
        direction,
        balance: this.normalizeAmount(String(record.balance ?? '0.00')),
        currency: 'MYR',
      });
    }

    const counts = new Map<string, number>();
    const candidateList = normalizedRows.map((row, index) => {
      const key = `${row.date}:${row.description}:${row.amount}:${row.reference ?? ''}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);

      const suggestionType: TransactionSuggestionType = row.direction === 'CREDIT' ? 'MONEY_IN' : 'MONEY_OUT';
      const suggestion: CandidateSuggestion = {
        type: suggestionType,
        financialAccountId: '22222222-2222-4222-8222-222222222222',
        accountId: suggestionType === 'MONEY_IN' ? '33333333-3333-4333-8333-333333333333' : '44444444-4444-4444-8444-444444444444',
        amount: row.amount,
        description: row.description,
        referenceNo: row.reference,
        date: row.date,
      };

      return {
        id: `candidate-${index + 1}-${Date.now()}`,
        businessId,
        source: 'BANK_STATEMENT' as const,
        raw: { date: row.originalDate, description: row.description, reference: row.reference, amount: row.rawAmount },
        normalized: row,
        duplicateStatus: 'NONE' as DuplicateStatus,
        status: 'PARSED' as const,
        suggestion,
        confidence: suggestionType === 'MONEY_IN' ? 92 : 88,
        auditTrail: [`Imported ${row.description}`],
      } satisfies UploadCandidate;
    });

    const candidates = candidateList.map((candidate) => {
      const key = `${candidate.normalized.date}:${candidate.normalized.description}:${candidate.normalized.amount}:${candidate.normalized.reference ?? ''}`;
      return {
        ...candidate,
        duplicateStatus: (counts.get(key) ?? 0) > 1 ? 'POSSIBLE_DUPLICATE' : 'NONE',
      } satisfies UploadCandidate;
    });

    const batch: ImportBatch = {
      id: `batch-${Date.now()}`,
      businessId,
      fileName,
      source: 'BANK_STATEMENT',
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      status: candidates.length > 0 ? 'REVIEW' : 'APPROVED',
      candidates,
      errors,
    };

    this.batches.set(batch.id, batch);
    return batch;
  }

  approveCandidate(candidateId: string, actor: string): UploadCandidate {
    const batch = [...this.batches.values()].find((entry) => entry.candidates.some((candidate) => candidate.id === candidateId));
    const candidate = batch?.candidates.find((entry) => entry.id === candidateId);

    if (!candidate) {
      throw new Error('Candidate not found.');
    }

    if (candidate.duplicateStatus !== 'NONE') {
      throw new Error('Duplicate candidates require manual review before approval.');
    }

    const approved: UploadCandidate = {
      ...candidate,
      status: 'APPROVED',
      auditTrail: [...(candidate.auditTrail ?? []), `${actor} approved ${candidate.suggestion.type}`],
    };

    if (batch) {
      batch.candidates = batch.candidates.map((entry) => (entry.id === candidateId ? approved : entry));
      batch.status = 'APPROVED';
    }

    return approved;
  }

  postApprovedCandidate(candidateId: string, actor: string, businessId: string): unknown {
    const batch = [...this.batches.values()].find((entry) => entry.businessId === businessId && entry.candidates.some((candidate) => candidate.id === candidateId));
    const candidate = batch?.candidates.find((entry) => entry.id === candidateId);

    if (!candidate) {
      throw new Error('Approved candidate not found.');
    }

    if (candidate.status !== 'APPROVED') {
      throw new Error('Only approved candidates can be posted.');
    }

    const service = new TransactionService(this.engine);
    const idempotencyKey = `upload-${candidate.id}`;
    const transaction = service.createTransaction({
      businessId,
      type: candidate.suggestion.type,
      date: candidate.suggestion.date,
      description: candidate.suggestion.description,
      amount: candidate.suggestion.amount,
      referenceNo: candidate.suggestion.referenceNo,
      financialAccountId: candidate.suggestion.financialAccountId,
      accountId: candidate.suggestion.accountId,
      createdBy: actor,
      idempotencyKey,
    });

    const posted = service.postTransaction(transaction.id, actor, idempotencyKey);
    candidate.status = 'POSTED';
    candidate.auditTrail = [...(candidate.auditTrail ?? []), `${actor} posted ${posted.journalId ?? 'journal'}`];

    return posted;
  }

  private parseCsvRow(row: string): string[] {
    const values: string[] = [];
    let buffer = '';
    let insideQuotes = false;

    for (let i = 0; i < row.length; i += 1) {
      const char = row[i];
      if (char === '"') {
        if (insideQuotes && row[i + 1] === '"') {
          buffer += '"';
          i += 1;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(buffer.trim());
        buffer = '';
      } else {
        buffer += char;
      }
    }

    values.push(buffer.trim());
    return values;
  }

  private normalizeDescription(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .replace(/\s*[-|/]+\s*/g, ' ')
      .trim();
  }

  private normalizeReference(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
  }

  private normalizeDate(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';
    const isoCandidate = new Date(trimmed);
    if (!Number.isNaN(isoCandidate.getTime())) {
      return isoCandidate.toISOString().slice(0, 10);
    }
    const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
      const [, day, month, year] = match;
      const normalizedYear = year.length === 2 ? `20${year}` : year;
      const date = new Date(`${normalizedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
    return trimmed;
  }

  private normalizeAmount(value: string): string {
    const cleaned = value.replace(/[RM\s,]/gi, '').replace(/[^0-9.-]/g, '');
    const asNumber = Number(cleaned || '0');
    return Number.isFinite(asNumber) ? new DecimalMoney(asNumber).toString() : '0.00';
  }

  private detectDirection(value: string, debit?: string, credit?: string): 'DEBIT' | 'CREDIT' {
    if (debit && !credit) {
      return 'DEBIT';
    }
    if (credit && !debit) {
      return 'CREDIT';
    }
    const numeric = Number(this.normalizeAmount(value));
    return numeric < 0 ? 'DEBIT' : 'CREDIT';
  }

  private firstNonEmptyString(...values: Array<string | undefined>): string {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0) ?? '';
  }
}
