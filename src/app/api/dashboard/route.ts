import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (user.role === 'ADMIN') {
      // Admin dashboard stats
      const totalEmployees = await db.user.count({
        where: { role: 'EMPLOYEE', isActive: true },
      });

      const allRecords = await db.paymentRecord.findMany({
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      const totalRecords = allRecords.length;
      const pendingCount = allRecords.filter((r) => r.status === 'PENDING').length;
      const paidCount = allRecords.filter((r) => r.status === 'PAID').length;

      const grandTotals = allRecords.reduce(
        (acc, r) => ({
          totalExpected: acc.totalExpected + r.totalExpected,
          totalReceived: acc.totalReceived + r.totalReceived,
          totalHMRC: acc.totalHMRC + r.totalHMRC,
          totalDue: acc.totalDue + r.totalDue,
          workedHours: acc.workedHours + r.workedHours,
        }),
        { totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0, workedHours: 0 }
      );

      // Recent records (last 10)
      const recentRecords = allRecords.slice(0, 10);

      return NextResponse.json({
        role: 'ADMIN',
        stats: {
          totalEmployees,
          totalRecords,
          pendingCount,
          paidCount,
          ...grandTotals,
        },
        recentRecords,
      });
    } else {
      // Employee dashboard stats
      const records = await db.paymentRecord.findMany({
        where: { userId: user.id },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      const totals = records.reduce(
        (acc, r) => ({
          totalExpected: acc.totalExpected + r.totalExpected,
          totalReceived: acc.totalReceived + r.totalReceived,
          totalHMRC: acc.totalHMRC + r.totalHMRC,
          totalDue: acc.totalDue + r.totalDue,
          workedHours: acc.workedHours + r.workedHours,
        }),
        { totalExpected: 0, totalReceived: 0, totalHMRC: 0, totalDue: 0, workedHours: 0 }
      );

      const pendingCount = records.filter((r) => r.status === 'PENDING').length;
      const recentRecords = records.slice(0, 6);

      // Current month vs previous
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const currentMonthRecord = records.find(
        (r) => r.month === currentMonth && r.year === currentYear
      );
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevMonthRecord = records.find(
        (r) => r.month === prevMonth && r.year === prevYear
      );

      return NextResponse.json({
        role: 'EMPLOYEE',
        stats: {
          totalRecords: records.length,
          pendingCount,
          ...totals,
        },
        recentRecords,
        comparison: {
          current: currentMonthRecord || null,
          previous: prevMonthRecord || null,
        },
      });
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
