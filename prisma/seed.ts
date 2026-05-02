import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Create demo user - the TrishulHub owner
  const demoPassword = await hashPassword('demo123');
  const demo = await prisma.user.upsert({
    where: { email: 'demo@trishulhub.com' },
    update: {},
    create: {
      email: 'demo@trishulhub.com',
      name: 'TrishulHub Demo',
      password: demoPassword,
      referralCode: 'TRISHUL-DEMO',
      isPremium: true,
    },
  });
  console.log('Demo user created:', demo.email);

  // Create companies for the demo user
  const greenCare = await prisma.company.upsert({
    where: { userId_name: { userId: demo.id, name: 'Green Care' } },
    update: {},
    create: {
      name: 'Green Care',
      userId: demo.id,
    },
  });
  console.log('Company created:', greenCare.name);

  const trishulHub = await prisma.company.upsert({
    where: { userId_name: { userId: demo.id, name: 'TrishulHub' } },
    update: {},
    create: {
      name: 'TrishulHub',
      userId: demo.id,
    },
  });
  console.log('Company created:', trishulHub.name);

  // Create demo payment records for Green Care
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
      where: { userId_companyId_month_year: { userId: demo.id, companyId: greenCare.id, month: m.month, year: m.year } },
      update: {},
      create: {
        userId: demo.id,
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

  // Create demo payment records for TrishulHub
  const trishulHubRecords = [
    { month: 1, year: 2026, expected: 2000, received: 2000, hmrc: 1600, hours: 160 },
    { month: 2, year: 2026, expected: 2000, received: 2000, hmrc: 1600, hours: 160 },
    { month: 3, year: 2026, expected: 2000, received: 1500, hmrc: 1600, hours: 160 },
  ];

  for (const m of trishulHubRecords) {
    const totalDue = m.expected - m.received;
    const status = m.received >= m.expected ? 'PAID' : 'PENDING';
    await prisma.paymentRecord.upsert({
      where: { userId_companyId_month_year: { userId: demo.id, companyId: trishulHub.id, month: m.month, year: m.year } },
      update: {},
      create: {
        userId: demo.id,
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
