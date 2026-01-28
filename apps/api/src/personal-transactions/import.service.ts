import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import { CurrencyService } from '../currency/currency.service';
import type { ImportMapping } from '@aurora/contracts';
import type { ParsedTransaction, ImportPreviewResult } from '@aurora/types';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * Parse CSV content with the given mapping
   */
  async parseCSV(
    content: string,
    mapping: ImportMapping,
  ): Promise<ParsedTransaction[]> {
    const lines = content.split('\n').filter(line => line.trim());
    const transactions: ParsedTransaction[] = [];

    // Skip header rows
    const dataLines = lines.slice(mapping.skipRows + 1);

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const columns = this.parseCSVLine(line, mapping.delimiter || ',');

      try {
        const parsed = this.parseRow(columns, mapping, i + mapping.skipRows + 1);
        if (parsed) {
          transactions.push(parsed);
        }
      } catch (error) {
        this.logger.warn(`Failed to parse row ${i + 1}: ${error.message}`);
      }
    }

    return transactions;
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Transform a row to a ParsedTransaction
   */
  private parseRow(
    columns: string[],
    mapping: ImportMapping,
    rowNumber: number,
  ): ParsedTransaction | null {
    const columnMap = new Map<string, number>();
    // Assume first row was headers, map column names to indices
    // For simplicity, we use the column name directly as index for now

    const getValue = (columnName: string): string => {
      const index = parseInt(columnName, 10);
      if (!isNaN(index)) {
        return columns[index] || '';
      }
      return columns[columnMap.get(columnName) || 0] || '';
    };

    // Parse date
    const dateStr = getValue(mapping.dateColumn);
    const date = this.parseDate(dateStr, mapping.dateFormat);
    if (!date) {
      throw new Error(`Invalid date: ${dateStr}`);
    }

    // Parse amount
    let amount = 0;
    let type: 'INCOME' | 'EXPENSE' = 'EXPENSE';

    if (mapping.amountFormat === 'positive_negative') {
      const amountStr = getValue(mapping.amountColumn);
      amount = this.parseAmount(amountStr);
      type = amount >= 0 ? 'INCOME' : 'EXPENSE';
      amount = Math.abs(amount);
    } else if (mapping.amountFormat === 'separate_columns') {
      const incomeStr = mapping.incomeColumn ? getValue(mapping.incomeColumn) : '';
      const expenseStr = mapping.expenseColumn ? getValue(mapping.expenseColumn) : '';

      const income = this.parseAmount(incomeStr);
      const expense = this.parseAmount(expenseStr);

      if (income > 0) {
        amount = income;
        type = 'INCOME';
      } else if (expense > 0) {
        amount = expense;
        type = 'EXPENSE';
      } else {
        return null; // Skip rows with no amount
      }
    } else {
      // with_sign format
      const amountStr = getValue(mapping.amountColumn);
      amount = this.parseAmount(amountStr);
      type = amount >= 0 ? 'INCOME' : 'EXPENSE';
      amount = Math.abs(amount);
    }

    if (amount === 0) {
      return null;
    }

    // Get description and merchant
    const description = mapping.descriptionColumn
      ? getValue(mapping.descriptionColumn)
      : undefined;
    const merchant = mapping.merchantColumn
      ? getValue(mapping.merchantColumn)
      : this.extractMerchant(description);

    return {
      transactionDate: date,
      amount,
      type,
      description,
      merchant,
      externalId: `row_${rowNumber}_${date.toISOString()}_${amount}`,
    };
  }

  /**
   * Parse date string with given format
   */
  private parseDate(dateStr: string, format: string): Date | null {
    if (!dateStr) return null;

    // Clean the date string
    dateStr = dateStr.trim().replace(/"/g, '');

    // Common formats
    const patterns: Record<string, RegExp> = {
      'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      'DD-MM-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      'DD.MM.YYYY': /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    };

    const pattern = patterns[format] || patterns['DD/MM/YYYY'];
    const match = dateStr.match(pattern);

    if (!match) {
      // Try ISO format
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
      return null;
    }

    let day: number, month: number, year: number;

    if (format === 'YYYY-MM-DD') {
      [, year, month, day] = match.map(Number);
    } else if (format === 'MM/DD/YYYY') {
      [, month, day, year] = match.map(Number);
    } else {
      [, day, month, year] = match.map(Number);
    }

    return new Date(year, month - 1, day);
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 0;

    // Clean the string
    let cleaned = amountStr
      .replace(/"/g, '')
      .replace(/\s/g, '')
      .replace(/€/g, '')
      .replace(/\$/g, '')
      .trim();

    // Handle European format (1.234,56)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
        // European: 1.234,56 -> 1234.56
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // US: 1,234.56 -> 1234.56
        cleaned = cleaned.replace(/,/g, '');
      }
    } else if (cleaned.includes(',') && !cleaned.includes('.')) {
      // Could be European decimal or thousand separator
      // If there are exactly 2 digits after comma, treat as decimal
      const parts = cleaned.split(',');
      if (parts[parts.length - 1].length === 2) {
        cleaned = cleaned.replace(',', '.');
      } else {
        cleaned = cleaned.replace(/,/g, '');
      }
    }

    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Extract merchant name from description
   */
  private extractMerchant(description?: string): string | undefined {
    if (!description) return undefined;

    // Common patterns for merchant extraction
    // Remove common prefixes
    let merchant = description
      .replace(/^(PAGAMENTO|POS|CARTA|BONIFICO|PRELIEVO|ADDEBITO)\s*/i, '')
      .replace(/\s*(DEL|IN DATA)\s*\d{2}\/\d{2}\/\d{4}.*$/i, '')
      .trim();

    // Take first part before common separators
    const separators = [' - ', ' / ', ' | ', '  '];
    for (const sep of separators) {
      if (merchant.includes(sep)) {
        merchant = merchant.split(sep)[0].trim();
        break;
      }
    }

    // Limit length
    if (merchant.length > 100) {
      merchant = merchant.substring(0, 100);
    }

    return merchant || undefined;
  }

  /**
   * Detect columns from file content
   */
  async detectColumns(content: string): Promise<{
    columns: string[];
    sampleRows: string[][];
    suggestedMapping: Partial<ImportMapping> | null;
  }> {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException('File must have at least 2 rows (header + data)');
    }

    const delimiter = this.detectDelimiter(lines[0]);
    const columns = this.parseCSVLine(lines[0], delimiter);
    const sampleRows = lines.slice(1, 6).map(line => this.parseCSVLine(line, delimiter));

    // Try to auto-detect mapping
    const suggestedMapping = this.autoDetectMapping(columns, sampleRows);

    return {
      columns,
      sampleRows,
      suggestedMapping: suggestedMapping ? { ...suggestedMapping, delimiter } : null,
    };
  }

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(headerLine: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';

    for (const d of delimiters) {
      const count = (headerLine.match(new RegExp(d, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = d;
      }
    }

    return bestDelimiter;
  }

  /**
   * Auto-detect column mapping based on header names
   */
  private autoDetectMapping(
    columns: string[],
    sampleRows: string[][],
  ): Partial<ImportMapping> | null {
    const lowerColumns = columns.map(c => c.toLowerCase().trim());

    // Common patterns for Italian banks
    const datePatterns = ['data', 'date', 'data operazione', 'data contabile', 'data valuta'];
    const amountPatterns = ['importo', 'amount', 'dare/avere', 'movimento', 'euro'];
    const descPatterns = ['descrizione', 'description', 'causale', 'dettagli', 'note'];
    const incomePatterns = ['entrate', 'accredito', 'avere', 'in'];
    const expensePatterns = ['uscite', 'addebito', 'dare', 'out'];

    const findColumn = (patterns: string[]): string | undefined => {
      const idx = lowerColumns.findIndex(col =>
        patterns.some(p => col.includes(p))
      );
      return idx >= 0 ? idx.toString() : undefined;
    };

    const dateColumn = findColumn(datePatterns);
    const amountColumn = findColumn(amountPatterns);
    const descColumn = findColumn(descPatterns);
    const incomeColumn = findColumn(incomePatterns);
    const expenseColumn = findColumn(expensePatterns);

    if (!dateColumn) {
      return null;
    }

    // Detect date format from sample
    const dateFormat = this.detectDateFormat(sampleRows, parseInt(dateColumn, 10));

    // Determine amount format
    let amountFormat: 'positive_negative' | 'separate_columns' | 'with_sign' = 'positive_negative';
    if (incomeColumn && expenseColumn) {
      amountFormat = 'separate_columns';
    }

    return {
      dateColumn,
      amountColumn: amountColumn || incomeColumn || expenseColumn,
      descriptionColumn: descColumn,
      incomeColumn,
      expenseColumn,
      dateFormat: dateFormat || 'DD/MM/YYYY',
      amountFormat,
      skipRows: 0,
      encoding: 'utf-8',
    };
  }

  /**
   * Detect date format from sample data
   */
  private detectDateFormat(sampleRows: string[][], columnIndex: number): string | null {
    for (const row of sampleRows) {
      const value = row[columnIndex];
      if (!value) continue;

      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
        // Check if day or month comes first
        const parts = value.split('/');
        if (parseInt(parts[0], 10) > 12) {
          return 'DD/MM/YYYY';
        } else if (parseInt(parts[1], 10) > 12) {
          return 'MM/DD/YYYY';
        }
        return 'DD/MM/YYYY'; // Default to European
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return 'YYYY-MM-DD';
      }
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(value)) {
        return 'DD-MM-YYYY';
      }
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
        return 'DD.MM.YYYY';
      }
    }

    return null;
  }

  /**
   * Preview import with duplicate detection
   */
  async previewImport(
    accountId: string,
    content: string,
    mapping: ImportMapping,
  ): Promise<ImportPreviewResult> {
    const transactions = await this.parseCSV(content, mapping);

    // Check for duplicates
    const existing = await prisma.personalTransaction.findMany({
      where: { accountId },
      select: {
        transactionDate: true,
        amount: true,
        description: true,
        externalId: true,
      },
    });

    const existingSet = new Set(
      existing.map(e => this.createFingerprint(e))
    );

    const newTransactions: ParsedTransaction[] = [];
    const duplicates: ParsedTransaction[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const fingerprint = this.createFingerprint({
        transactionDate: tx.transactionDate,
        amount: tx.amount,
        description: tx.description,
      });

      if (existingSet.has(fingerprint)) {
        duplicates.push(tx);
      } else {
        newTransactions.push(tx);
        existingSet.add(fingerprint);
      }
    }

    return {
      totalRows: transactions.length,
      validRows: newTransactions.length,
      duplicateRows: duplicates.length,
      errorRows: errors.length,
      sampleTransactions: newTransactions.slice(0, 10),
      errors,
    };
  }

  /**
   * Create a fingerprint for duplicate detection
   */
  private createFingerprint(tx: {
    transactionDate: Date;
    amount: number;
    description?: string | null;
  }): string {
    const dateStr = tx.transactionDate.toISOString().split('T')[0];
    return `${dateStr}|${tx.amount.toFixed(2)}|${tx.description?.toLowerCase().trim() || ''}`;
  }

  /**
   * Execute import
   */
  async executeImport(
    userId: string,
    accountId: string,
    content: string,
    mapping: ImportMapping,
  ): Promise<{
    batchId: string;
    imported: number;
    duplicates: number;
    errors: number;
  }> {
    // Create batch record
    const batch = await prisma.importBatch.create({
      data: {
        userId,
        accountId,
        filename: 'import.csv',
        source: 'csv',
        status: 'processing',
        mapping: mapping as any,
      },
    });

    try {
      const transactions = await this.parseCSV(content, mapping);
      const preview = await this.previewImport(accountId, content, mapping);

      // Import only non-duplicate transactions
      const toImport = transactions.filter(tx => {
        const fingerprint = this.createFingerprint({
          transactionDate: tx.transactionDate,
          amount: tx.amount,
          description: tx.description,
        });
        return !preview.sampleTransactions.find(
          st => this.createFingerprint({
            transactionDate: st.transactionDate,
            amount: st.amount,
            description: st.description,
          }) === fingerprint
        );
      });

      // Actually, import the valid rows from preview
      for (const tx of preview.sampleTransactions) {
        const amountEur = this.currencyService.convertToEur(tx.amount, 'EUR');

        await prisma.personalTransaction.create({
          data: {
            userId,
            accountId,
            type: tx.type,
            amount: tx.amount,
            currency: 'EUR',
            amountEur,
            description: tx.description,
            merchant: tx.merchant,
            transactionDate: tx.transactionDate,
            importBatchId: batch.id,
            importSource: 'csv_import',
            externalId: tx.externalId,
          },
        });
      }

      // Update batch status
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'completed',
          totalRows: transactions.length,
          processedRows: transactions.length,
          importedRows: preview.validRows,
          duplicateRows: preview.duplicateRows,
          errorRows: preview.errorRows,
          completedAt: new Date(),
        },
      });

      return {
        batchId: batch.id,
        imported: preview.validRows,
        duplicates: preview.duplicateRows,
        errors: preview.errorRows,
      };
    } catch (error) {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: 'failed',
          errors: [{ message: error.message }],
        },
      });
      throw error;
    }
  }

  /**
   * Get import history
   */
  async getImportHistory(userId: string) {
    return prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
