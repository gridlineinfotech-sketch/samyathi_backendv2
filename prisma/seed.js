const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient(getPrismaClientOptions());

function getPrismaClientOptions() {
  const currentUrl = process.env.DATABASE_URL;
  const localUrl =
    process.env.DATABASE_URL_LOCAL ||
    process.env.DATABASE_PUBLIC_URL ||
    process.env.DATABASE_URL_EXTERNAL;

  if (
    currentUrl &&
    currentUrl.includes('.railway.internal') &&
    !process.env.RAILWAY_PROJECT_ID &&
    localUrl
  ) {
    console.warn(
      'Using external database URL for local seed because DATABASE_URL points to Railway private networking.',
    );

    return {
      datasources: {
        db: {
          url: localUrl,
        },
      },
    };
  }

  return undefined;
}

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'Skipping admin seed. Set ADMIN_EMAIL and ADMIN_PASSWORD to create an admin user.',
    );
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
