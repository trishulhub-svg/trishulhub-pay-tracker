import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@greencare.com' },
    update: {},
    create: {
      email: 'admin@greencare.com',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Admin user created:', admin.email);

  // Create a demo employee
  const empPassword = await hashPassword('employee123');
  const employee = await prisma.user.upsert({
    where: { email: 'employee@greencare.com' },
    update: {},
    create: {
      email: 'employee@greencare.com',
      name: 'John Employee',
      password: empPassword,
      role: 'EMPLOYEE',
      isActive: true,
    },
  });
  console.log('Demo employee created:', employee.email);

  // Create some demo payment records for the employee
  const months = [
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

  for (const m of months) {
    const totalDue = m.expected - m.received;
    const status = m.received >= m.expected ? 'PAID' : 'PENDING';
    await prisma.paymentRecord.upsert({
      where: { userId_month_year: { userId: employee.id, month: m.month, year: m.year } },
      update: {},
      create: {
        userId: employee.id,
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
  console.log('Demo payment records created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
