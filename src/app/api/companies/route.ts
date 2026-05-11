import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const companies = await db.company.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Batch count payment records per company (1 query instead of N+1)
    const companiesWithCount = companies.map((c: any) => ({
      ...c,
      _count: { paymentRecords: 0 },
    }));
    if (companies.length > 0) {
      try {
        const client = (await import('@/lib/db')).getTursoClientIfAvailable?.();
        if (client) {
          const ids = companies.map((c: any) => c.id);
          const placeholders = ids.map(() => '?').join(', ');
          const result = await client.execute({
            sql: `SELECT companyId, COUNT(*) as cnt FROM PaymentRecord WHERE companyId IN (${placeholders}) GROUP BY companyId`,
            args: ids,
          });
          const countMap = new Map<string, number>();
          for (const row of result.rows) {
            countMap.set(row.companyId as string, Number(row.cnt));
          }
          for (const c of companiesWithCount) {
            c._count.paymentRecords = countMap.get(c.id) || 0;
          }
        }
      } catch { /* fallback: counts stay at 0 */ }
    }

    return NextResponse.json({ companies: companiesWithCount });
  } catch (error) {
    console.error('Companies list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, payRate } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    // Check if user already has a company and is not premium
    const existingCompanies = await db.company.count({
      where: { userId: user.id },
    });

    if (existingCompanies >= 1 && !user.isPremium) {
      return NextResponse.json(
        { error: 'Premium required to add multiple companies. Refer a friend to unlock Premium!' },
        { status: 403 }
      );
    }

    // Check for duplicate name
    const existingWithName = await db.company.findUnique({
      where: { userId_name: { userId: user.id, name: name.trim() } },
    });

    if (existingWithName) {
      return NextResponse.json({ error: 'A company with this name already exists' }, { status: 409 });
    }

    const parsedPayRate = parseFloat(payRate) || 0;

    const company = await db.company.create({
      data: {
        name: name.trim(),
        userId: user.id,
        payRate: parsedPayRate,
      },
    });

    // If pay rate is set, create initial pay rate history entry
    if (parsedPayRate > 0) {
      await db.payRateHistory.create({
        data: {
          companyId: company.id,
          payRate: parsedPayRate,
          effectiveFrom: new Date().toISOString().split('T')[0], // Today
        },
      });
    }

    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
