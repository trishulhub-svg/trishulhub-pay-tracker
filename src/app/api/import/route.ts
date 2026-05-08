import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Check authentication and premium status
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.isPremium) {
      return NextResponse.json({ error: 'Premium access required for data import' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const importType = formData.get('importType') as string || 'auto'; // 'shifts', 'payments', or 'auto'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isPDF = fileName.endsWith('.pdf');
    const isDOCX = fileName.endsWith('.docx') || fileName.endsWith('.doc');

    if (!isCSV && !isPDF && !isDOCX) {
      return NextResponse.json({ error: 'Unsupported file format. Please upload CSV, PDF, or DOCX files.' }, { status: 400 });
    }

    // Get user's companies for matching
    const companies = await db.company.findMany({
      where: { userId: user.id },
      orderBy: { name: 'asc' },
    });

    let extractedData: any;

    if (isCSV) {
      extractedData = await parseCSV(file, companies, importType);
    } else if (isPDF) {
      extractedData = await parsePDF(file, companies, importType, user.id);
    } else {
      extractedData = await parseDOCX(file, companies, importType, user.id);
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: isCSV ? 'csv' : isPDF ? 'pdf' : 'docx',
      ...extractedData,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file' },
      { status: 500 }
    );
  }
}

// ==================== CSV PARSING ====================
async function parseCSV(file: File, companies: any[], importType: string) {
  const text = await file.text();

  return new Promise<{ shifts: any[]; payments: any[]; warnings: string[] }>((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete: (results: any) => {
        const warnings: string[] = [];
        const shifts: any[] = [];
        const payments: any[] = [];

        if (results.errors.length > 0) {
          warnings.push(`CSV parsing warnings: ${results.errors.slice(0, 5).map((e: any) => e.message).join('; ')}`);
        }

        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          warnings.push('No data rows found in the CSV file');
          resolve({ shifts, payments, warnings });
          return;
        }

        // Get column headers for smart mapping
        const headers = Object.keys(rows[0]);

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            const detected = detectRowType(row, headers, importType);

            if (detected === 'shift') {
              const shift = mapRowToShift(row, companies);
              if (shift) shifts.push(shift);
            } else if (detected === 'payment') {
              const payment = mapRowToPayment(row, companies);
              if (payment) payments.push(payment);
            } else {
              // Try both — add whichever has more data
              const shift = mapRowToShift(row, companies);
              const payment = mapRowToPayment(row, companies);
              if (shift && payment) {
                // If row has date+time fields, it's likely a shift
                if (row['start time'] || row['starttime'] || row['start'] || row['end time'] || row['endtime'] || row['end']) {
                  shifts.push(shift);
                } else {
                  payments.push(payment);
                }
              } else if (shift) {
                shifts.push(shift);
              } else if (payment) {
                payments.push(payment);
              } else {
                warnings.push(`Row ${i + 2}: Could not map to shift or payment record`);
              }
            }
          } catch (e) {
            warnings.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Parse error'}`);
          }
        }

        resolve({ shifts, payments, warnings });
      },
      error: (error: any) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

// Detect if a row is a shift or payment record
function detectRowType(row: Record<string, string>, headers: string[], importType: string): 'shift' | 'payment' | 'auto' {
  if (importType === 'shifts') return 'shift';
  if (importType === 'payments') return 'payment';

  // Auto-detect based on column headers
  const shiftKeywords = ['start time', 'starttime', 'start', 'end time', 'endtime', 'end', 'break', 'shift type', 'shifttype', 'clock in', 'clock out'];
  const paymentKeywords = ['total expected', 'totalexpected', 'expected', 'total received', 'totalreceived', 'received', 'hmrc', 'tax', 'due', 'month', 'year', 'payroll'];

  const shiftScore = headers.filter(h => shiftKeywords.some(k => h.includes(k))).length;
  const paymentScore = headers.filter(h => paymentKeywords.some(k => h.includes(k))).length;

  if (shiftScore > paymentScore) return 'shift';
  if (paymentScore > shiftScore) return 'payment';
  return 'auto';
}

// Smart field finder - tries multiple possible column names
function findField(row: Record<string, string>, ...possibleNames: string[]): string | undefined {
  for (const name of possibleNames) {
    const val = row[name];
    if (val && val.trim()) return val.trim();
  }
  return undefined;
}

function findCompanyMatch(companyName: string | undefined, companies: any[]): string | null {
  if (!companyName) return null;
  const lower = companyName.toLowerCase().trim();
  const match = companies.find(c => c.name.toLowerCase() === lower);
  if (match) return match.id;
  // Partial match
  const partial = companies.find(c => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()));
  return partial?.id || null;
}

function mapRowToShift(row: Record<string, string>, companies: any[]): any | null {
  const date = findField(row, 'date', 'shift date', 'shiftdate', 'work date', 'workdate');
  const startTime = findField(row, 'start time', 'starttime', 'start', 'clock in', 'clockin', 'time in');
  const endTime = findField(row, 'end time', 'endtime', 'end', 'clock out', 'clockout', 'time out');
  const companyName = findField(row, 'company', 'company name', 'companyname', 'employer', 'client');
  const totalHours = findField(row, 'total hours', 'totalhours', 'hours', 'hours worked', 'hoursworked');
  const breakMinutes = findField(row, 'break', 'break minutes', 'breakminutes', 'break mins', 'breakmins');
  const payRate = findField(row, 'pay rate', 'payrate', 'rate', 'hourly rate', 'hourlyrate', 'hour rate');
  const shiftType = findField(row, 'shift type', 'shifttype', 'type', 'shift');
  const notes = findField(row, 'notes', 'note', 'comment', 'comments', 'description');

  // Must have at least a date
  if (!date) return null;

  const companyId = findCompanyMatch(companyName, companies);

  return {
    date: normalizeDate(date),
    startTime: normalizeTime(startTime),
    endTime: normalizeTime(endTime),
    breakMinutes: breakMinutes ? parseNumber(breakMinutes) : 0,
    totalHours: totalHours ? parseNumber(totalHours) : 0,
    payRate: payRate ? parseNumber(payRate) : 0,
    shiftType: normalizeShiftType(shiftType),
    notes: notes || null,
    companyName: companyName || null,
    companyId,
    // Flag if company not matched
    companyMatched: !!companyId,
  };
}

function mapRowToPayment(row: Record<string, string>, companies: any[]): any | null {
  const companyName = findField(row, 'company', 'company name', 'companyname', 'employer', 'client');
  const month = findField(row, 'month', 'period', 'pay month');
  const year = findField(row, 'year', 'pay year', 'tax year');
  const totalExpected = findField(row, 'total expected', 'totalexpected', 'expected', 'gross', 'gross pay', 'grosspay');
  const totalReceived = findField(row, 'total received', 'totalreceived', 'received', 'net', 'net pay', 'netpay', 'take home');
  const totalHMRC = findField(row, 'hmrc', 'tax', 'total hmrc', 'totalhmrc', 'tax deducted', 'income tax', 'national insurance');
  const totalDue = findField(row, 'total due', 'totaldue', 'due', 'amount due', 'balance due', 'owed');
  const workedHours = findField(row, 'worked hours', 'workedhours', 'hours', 'hours worked', 'hoursworked');
  const notes = findField(row, 'notes', 'note', 'comment', 'comments');

  // Must have at least month or company
  if (!month && !companyName) return null;

  const companyId = findCompanyMatch(companyName, companies);

  return {
    month: month ? parseMonth(month) : new Date().getMonth() + 1,
    year: year ? parseYear(year) : new Date().getFullYear(),
    companyName: companyName || null,
    companyId,
    companyMatched: !!companyId,
    totalExpected: totalExpected ? parseNumber(totalExpected) : 0,
    totalReceived: totalReceived ? parseNumber(totalReceived) : 0,
    totalHMRC: totalHMRC ? parseNumber(totalHMRC) : 0,
    totalDue: totalDue ? parseNumber(totalDue) : 0,
    workedHours: workedHours ? parseNumber(workedHours) : 0,
    notes: notes || null,
  };
}

// ==================== PDF PARSING (with AI) ====================
async function parsePDF(file: File, companies: any[], importType: string, userId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    const textParts: string[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    const text = textParts.join('\n\n');

    if (!text || text.trim().length < 10) {
      return { shifts: [], payments: [], warnings: ['PDF appears to be empty or contains only images. Text could not be extracted.'] };
    }

    // Use AI to extract structured data from PDF text
    return await extractWithAI(text, companies, importType, userId, 'PDF');
  } catch (e) {
    console.error('PDF parse error:', e);
    return { shifts: [], payments: [], warnings: ['Failed to parse PDF file. It may be encrypted or corrupted.'] };
  }
}

// ==================== DOCX PARSING (with AI) ====================
async function parseDOCX(file: File, companies: any[], importType: string, userId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim().length < 10) {
      return { shifts: [], payments: [], warnings: ['DOCX appears to be empty. Text could not be extracted.'] };
    }

    // Use AI to extract structured data from DOCX text
    return await extractWithAI(text, companies, importType, userId, 'DOCX');
  } catch (e) {
    console.error('DOCX parse error:', e);
    return { shifts: [], payments: [], warnings: ['Failed to parse DOCX file.'] };
  }
}

// ==================== AI EXTRACTION ====================
// Z.AI API endpoints — General vs Coding Plan
// Correct base URL: https://open.bigmodel.cn/api/paas/v4/
// The z.ai API (GLM models by Zhipu AI) is OpenAI-compatible
const ZAI_ENDPOINTS: Record<string, string> = {
  general: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  coding: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
};

async function extractWithAI(text: string, companies: any[], importType: string, userId: string, sourceType: string): Promise<{ shifts: any[]; payments: any[]; warnings: string[] }> {
  // Read AI settings DIRECTLY from DB — no cache — to avoid stale values
  // across different Vercel serverless function instances
  const settings = await db.setting.getAll();
  const apiKey = settings.ZAI_API_KEY;
  const model = settings.ZAI_MODEL || 'glm-4.5-flash';
  const endpointKey = settings.ZAI_API_ENDPOINT || 'general';
  const apiUrl = ZAI_ENDPOINTS[endpointKey] || ZAI_ENDPOINTS.general;

  if (!apiKey) {
    return {
      shifts: [],
      payments: [],
      warnings: ['AI import is not configured. Admin needs to set the Z.AI API key in Admin Settings first.'],
    };
  }

  // Truncate text if too long (max ~8000 chars to stay within token limits)
  const maxTextLen = 8000;
  const truncatedText = text.length > maxTextLen ? text.substring(0, maxTextLen) + '\n...[truncated]' : text;

  const companyNames = companies.map(c => c.name);

  const prompt = `You are a data extraction assistant for a UK payroll tracker app called "TrishulHub Pay Tracker".

The user has uploaded a ${sourceType} document. Extract all shift and payment record data from the text below.

IMPORTANT RULES:
1. Extract data as JSON with two arrays: "shifts" and "payments"
2. For each shift, extract: date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), breakMinutes (number), totalHours (number), payRate (number), shiftType ("REGULAR", "OVERTIME", "HOLIDAY", "SICK", or "UNPAID"), notes (string or null), companyName (match to one of: ${companyNames.join(', ')} if possible, or use the name from the document)
3. For each payment, extract: month (1-12), year (4 digits), companyName, totalExpected (number in GBP), totalReceived (number in GBP), totalHMRC (number in GBP), totalDue (number in GBP), workedHours (number), notes (string or null)
4. All monetary values should be numbers (no currency symbols)
5. Dates should be YYYY-MM-DD format. If you see "01/03/2024" it could be DD/MM/YYYY (UK format) - use context to decide
6. If a field is not found, use null
7. If the document doesn't contain relevant shift/payment data, return empty arrays
8. Only return valid JSON, no markdown or explanation

Document text:
---
${truncatedText}
---

Return JSON in this exact format:
{"shifts": [...], "payments": [...]}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      return {
        shifts: [],
        payments: [],
        warnings: [`AI extraction failed (HTTP ${response.status}). Please check the Z.AI API key in Admin Settings.`],
      };
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      return { shifts: [], payments: [], warnings: ['AI returned empty response'] };
    }

    // Parse the AI response - handle potential markdown code blocks
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const parsed = JSON.parse(jsonStr);

    const shifts: any[] = (parsed.shifts || []).map((s: any) => ({
      ...s,
      companyId: findCompanyMatch(s.companyName, companies),
      companyMatched: !!findCompanyMatch(s.companyName, companies),
    }));

    const payments: any[] = (parsed.payments || []).map((p: any) => ({
      ...p,
      companyId: findCompanyMatch(p.companyName, companies),
      companyMatched: !!findCompanyMatch(p.companyName, companies),
    }));

    const warnings: string[] = [];
    const unmatchedShifts = shifts.filter(s => !s.companyMatched && s.companyName);
    const unmatchedPayments = payments.filter(p => !p.companyMatched && p.companyName);
    if (unmatchedShifts.length > 0) {
      warnings.push(`${unmatchedShifts.length} shift(s) have company names that don't match your existing companies. They will create new companies or need manual matching.`);
    }
    if (unmatchedPayments.length > 0) {
      warnings.push(`${unmatchedPayments.length} payment(s) have company names that don't match your existing companies. They will create new companies or need manual matching.`);
    }

    return { shifts, payments, warnings };
  } catch (e) {
    console.error('AI extraction error:', e);
    return {
      shifts: [],
      payments: [],
      warnings: [`AI extraction error: ${e instanceof Error ? e.message : 'Unknown error'}. The document format may not be supported.`],
    };
  }
}

// ==================== HELPER FUNCTIONS ====================
function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = val.replace(/[£$€,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

function parseMonth(val: string): number {
  // Try numeric first
  const num = parseInt(val);
  if (num >= 1 && num <= 12) return num;

  // Try month name
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const lower = val.toLowerCase().trim();
  const idx = months.findIndex(m => lower.includes(m));
  if (idx >= 0) return idx + 1;

  // Default to current month
  return new Date().getMonth() + 1;
}

function parseYear(val: string): number {
  const num = parseInt(val);
  if (num >= 2000 && num <= 2100) return num;
  if (num >= 0 && num <= 99) return 2000 + num;
  return new Date().getFullYear();
}

function normalizeDate(val: string | undefined): string {
  if (!val) return new Date().toISOString().split('T')[0];
  try {
    // Try various date formats
    const cleaned = val.trim();

    // DD/MM/YYYY or DD-MM-YYYY (UK format)
    const ukMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ukMatch) {
      const [, day, month, year] = ukMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // MM/DD/YYYY (US format - less common in UK)
    const usMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usMatch) {
      // If first number > 12, it must be a day (UK format)
      const first = parseInt(usMatch[1]);
      if (first > 12) {
        return `${usMatch[3]}-${usMatch[2].padStart(2, '0')}-${usMatch[1].padStart(2, '0')}`;
      }
    }

    // YYYY-MM-DD (ISO format)
    const isoMatch = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    // Fallback: let JS parse it
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function normalizeTime(val: string | undefined): string {
  if (!val) return '09:00';
  try {
    const cleaned = val.trim().toUpperCase();

    // HH:MM AM/PM
    const ampmMatch = cleaned.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1]);
      const minutes = ampmMatch[2] ? parseInt(ampmMatch[2]) : 0;
      const period = ampmMatch[3].toUpperCase();
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // HH:MM (24h)
    const h24Match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
    if (h24Match) {
      return `${h24Match[1].padStart(2, '0')}:${h24Match[2]}`;
    }

    return '09:00';
  } catch {
    return '09:00';
  }
}

function normalizeShiftType(val: string | undefined): string {
  if (!val) return 'REGULAR';
  const lower = val.toLowerCase().trim();
  if (lower.includes('overtime') || lower.includes('ot')) return 'OVERTIME';
  if (lower.includes('holiday') || lower.includes('annual')) return 'HOLIDAY';
  if (lower.includes('sick')) return 'SICK';
  if (lower.includes('unpaid')) return 'UNPAID';
  return 'REGULAR';
}
