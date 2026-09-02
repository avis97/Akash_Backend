const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mockData = require('../src/mockData');

async function main() {
  console.log('🌱 Starting VS DIGITECH CRM Database Seeding...');

  // Seed Users
  for (const u of mockData.mockUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        password: '$2a$10$e8W1x02eK0l0L/MockHashedPassword',
        phone: u.phone,
        designation: u.designation,
        role: u.role,
        isMfaEnabled: u.isMfaEnabled,
        avatarUrl: u.avatarUrl
      }
    });
  }
  console.log('✅ Users seeded');

  // Seed Products
  for (const p of mockData.mockProducts) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand,
        stockQuantity: p.stockQuantity,
        unit: p.unit,
        minStockAlert: p.minStockAlert,
        unitPrice: p.unitPrice,
        qrCodeUrl: p.qrCodeUrl
      }
    });
  }
  console.log('✅ Products seeded');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
