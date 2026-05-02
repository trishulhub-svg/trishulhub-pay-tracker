import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Create admin user - the TrishulHub owner
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trishulhub.com' },
    update: {},
    create: {
      email: 'admin@trishulhub.com',
      name: 'TrishulHub Admin',
      password: adminPassword,
      referralCode: 'TRISHUL-ADMIN',
      isPremium: true,
      role: 'ADMIN',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  });
  console.log('Admin user created:', admin.email);

  // Create demo user
  const demoPassword = await hashPassword('demo123');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@trishulhub.com' },
    update: {},
    create: {
      email: 'demo@trishulhub.com',
      name: 'Demo User',
      password: demoPassword,
      referralCode: 'TRISHUL-DEMO',
      isPremium: true,
      role: 'USER',
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      referredBy: 'TRISHUL-ADMIN',
    },
  });
  console.log('Demo user created:', demo.email);

  // Create companies for the admin user
  const greenCare = await prisma.company.upsert({
    where: { userId_name: { userId: admin.id, name: 'Green Care' } },
    update: {},
    create: {
      name: 'Green Care',
      userId: admin.id,
    },
  });
  console.log('Company created:', greenCare.name);

  const trishulHub = await prisma.company.upsert({
    where: { userId_name: { userId: admin.id, name: 'TrishulHub' } },
    update: {},
    create: {
      name: 'TrishulHub',
      userId: admin.id,
    },
  });
  console.log('Company created:', trishulHub.name);

  // Create demo payment records for Green Care (admin user)
  const greenCareRecords = [
    { month: 4, year: 2025, expected: 725, received: 725, hmrc: 580, hours: 58 },
    { month: 5, year: 2025, expected: 606.25, received: 606.25, hmrc: 485, hours: 48.5 },
    { month: 6, year: 2025, expected: 1143.75, received: 885.42, hmrc: 915, hours: 91.5 },
    { month: 7, year: 2025, expected: 1200, received: 1200, hmrc: 960, hours: 96 },
    { month: 8, year: 2025, expected: 900, received: 900, hmrc: 720, hours: 72 },
    { month: 9, year: 2025, expected: 1050, received: 1050, hmrc: 840, hours: 84 },
    { month: 10, year: 2025, expected: 975, received: 716.67, hmrc: 780, hours: 78 },
    { month: 11, year: 2025, expected: 1100, received: 1040.87, hmrc: 880, hours: 88 },
    { month: 12, year: 2025, expected: 800, received: 800, hmrc: 640, hours: 64 },
    { month: 1, year: 2026, expected: 1300, received: 1300, hmrc: 1040, hours: 104 },
    { month: 2, year: 2026, expected: 1150, received: 1090.87, hmrc: 920, hours: 92 },
    { month: 3, year: 2026, expected: 960, received: 0, hmrc: 768, hours: 76.8 },
  ];

  for (const m of greenCareRecords) {
    const totalDue = m.expected - m.received;
    const status = m.received >= m.expected ? 'PAID' : 'PENDING';
    await prisma.paymentRecord.upsert({
      where: { userId_companyId_month_year: { userId: admin.id, companyId: greenCare.id, month: m.month, year: m.year } },
      update: {},
      create: {
        userId: admin.id,
        companyId: greenCare.id,
        month: m.month,
        year: m.year,
        totalExpected: m.expected,
        totalReceived: m.received,
        totalHMRC: m.hmrc,
        totalDue: totalDue > 0 ? totalDue : 0,
        workedHours: m.hours,
        status: status,
      },
    });
  }
  console.log('Green Care payment records created');

  // Create demo payment records for TrishulHub (admin user)
  const trishulHubRecords = [
    { month: 1, year: 2026, expected: 2000, received: 2000, hmrc: 1600, hours: 160 },
    { month: 2, year: 2026, expected: 2000, received: 2000, hmrc: 1600, hours: 160 },
    { month: 3, year: 2026, expected: 2000, received: 1500, hmrc: 1600, hours: 160 },
  ];

  for (const m of trishulHubRecords) {
    const totalDue = m.expected - m.received;
    const status = m.received >= m.expected ? 'PAID' : 'PENDING';
    await prisma.paymentRecord.upsert({
      where: { userId_companyId_month_year: { userId: admin.id, companyId: trishulHub.id, month: m.month, year: m.year } },
      update: {},
      create: {
        userId: admin.id,
        companyId: trishulHub.id,
        month: m.month,
        year: m.year,
        totalExpected: m.expected,
        totalReceived: m.received,
        totalHMRC: m.hmrc,
        totalDue: totalDue > 0 ? totalDue : 0,
        workedHours: m.hours,
        status: status,
      },
    });
  }
  console.log('TrishulHub payment records created');

  // Create demo shift records for Green Care (current month - April 2026)
  const shiftData = [
    { date: '2026-04-01', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-02', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-03', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-04', start: '09:00', end: '13:00', break: 0, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-07', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-08', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-09', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-10', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-11', start: '09:00', end: '13:00', break: 0, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-14', start: '09:00', end: '17:30', break: 60, type: 'OVERTIME', location: 'Office' },
    { date: '2026-04-15', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-16', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-17', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-18', start: '09:00', end: '13:00', break: 0, type: 'HOLIDAY', location: 'Office' },
    { date: '2026-04-21', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-22', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-23', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-24', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-25', start: '09:00', end: '13:00', break: 0, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-28', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-29', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
    { date: '2026-04-30', start: '09:00', end: '17:00', break: 60, type: 'REGULAR', location: 'Office' },
  ];

  for (const s of shiftData) {
    const [startH, startM] = s.start.split(':').map(Number);
    const [endH, endM] = s.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    const workedMinutes = endMinutes - startMinutes - s.break;
    const totalHours = Math.max(0, workedMinutes / 60);

    await prisma.shift.create({
      data: {
        userId: admin.id,
        companyId: greenCare.id,
        date: s.date,
        startTime: s.start,
        endTime: s.end,
        breakMinutes: s.break,
        totalHours: Math.round(totalHours * 100) / 100,
        shiftType: s.type,
        location: s.location,
      },
    });
  }
  console.log('Green Care shift records created');

  // Create some shifts for TrishulHub too
  const thShifts = [
    { date: '2026-04-01', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-02', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-03', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-04', start: '10:00', end: '14:00', break: 0, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-07', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-08', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-09', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-10', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-11', start: '10:00', end: '14:00', break: 0, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-14', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-15', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
    { date: '2026-04-16', start: '10:00', end: '18:00', break: 60, type: 'REGULAR', location: 'Remote' },
  ];

  for (const s of thShifts) {
    const [startH, startM] = s.start.split(':').map(Number);
    const [endH, endM] = s.end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    const workedMinutes = endMinutes - startMinutes - s.break;
    const totalHours = Math.max(0, workedMinutes / 60);

    await prisma.shift.create({
      data: {
        userId: admin.id,
        companyId: trishulHub.id,
        date: s.date,
        startTime: s.start,
        endTime: s.end,
        breakMinutes: s.break,
        totalHours: Math.round(totalHours * 100) / 100,
        shiftType: s.type,
        location: s.location,
      },
    });
  }
  console.log('TrishulHub shift records created');

  console.log('\n=== Seed Complete ===');
  console.log('Admin: admin@trishulhub.com / admin123');
  console.log('Demo:  demo@trishulhub.com / demo123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
