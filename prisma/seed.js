const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Skipping admin seed. Set ADMIN_EMAIL and ADMIN_PASSWORD to create an admin user.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: process.env.ADMIN_NAME || 'Pilgrim Admin',
      password: hashedPassword,
      role: 'ADMIN',
      verified: true,
      status: 'active',
    },
    create: {
      email,
      name: process.env.ADMIN_NAME || 'Pilgrim Admin',
      password: hashedPassword,
      role: 'ADMIN',
      verified: true,
      status: 'active',
    },
  });

  console.log(`Admin user ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error('Admin seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
