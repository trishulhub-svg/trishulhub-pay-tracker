import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// REC-005: Allowed MIME types for payslip uploads
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

// REC-005: Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// REC-005: Map MIME to safe file extension
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
};

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const recordId = formData.get('recordId') as string | null;

    if (!file || !recordId) {
      return NextResponse.json({ error: 'File and recordId are required' }, { status: 400 });
    }

    // REC-005: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // REC-005: Validate MIME type server-side (not just file extension)
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, PNG, and JPEG files are allowed.' },
        { status: 400 }
      );
    }

    // Check record exists and belongs to user
    const record = await db.paymentRecord.findUnique({ where: { id: recordId } });
    if (!record || record.userId !== user.id) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // REC-005: Delete old payslip if one exists
    if (record.paySlipUrl) {
      try {
        const oldPath = path.join(process.cwd(), 'public', record.paySlipUrl);
        await unlink(oldPath);
      } catch { /* file may not exist, ignore */ }
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // REC-005: Use MIME-based extension + crypto random for security (ignore user-provided extension)
    const safeExt = MIME_TO_EXT[file.type] || '.bin';
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const filename = `${recordId}-${randomSuffix}${safeExt}`;
    const filepath = path.join(uploadsDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    // Update record
    const updatedRecord = await db.paymentRecord.update({
      where: { id: recordId },
      data: {
        paySlipUrl: `/uploads/${filename}`,
        paySlipName: file.name,
      },
    });

    return NextResponse.json({
      record: updatedRecord,
      url: `/uploads/${filename}`,
    });
  } catch (error) {
    console.error('Upload payslip error:', error);
    return NextResponse.json({ error: 'Failed to upload payslip' }, { status: 500 });
  }
}
