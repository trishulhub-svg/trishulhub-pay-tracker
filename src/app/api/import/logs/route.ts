import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/import/logs — Fetch import history for the current user
// IMP-029: Added optional ?page= & ?limit= query params for pagination
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.isPremium) {
      return NextResponse.json({ error: 'Premium access required' }, { status: 403 });
    }

    // IMP-029: Parse pagination params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
    const offset = (page - 1) * limit;

    // Fetch all logs for the user (paginated on server side via slice)
    // Note: The db abstraction doesn't expose SQL OFFSET, so we slice in JS
    const allLogs = await db.importLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    const pagedLogs = allLogs.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      logs: pagedLogs,
      page,
      limit,
      total: allLogs.length,
      hasMore: allLogs.length > offset + limit,
    });
  } catch (error) {
    console.error('Import logs fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch import logs' },
      { status: 500 }
    );
  }
}
