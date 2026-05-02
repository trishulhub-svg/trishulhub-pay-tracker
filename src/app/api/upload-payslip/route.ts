import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: user ? 403 : 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const recordId = formData.get('recordId') as string | null;

    if (!file || !recordId) {
      return NextResponse.json({ error: 'File and recordId are required' }, { status: 400 });
    }

    // Check record exists
    const record = await db.paymentRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Create uploads directory if not exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const ext = path.extname(file.name);
    const filename = `${recordId}-${Date.now()}${ext}`;
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
