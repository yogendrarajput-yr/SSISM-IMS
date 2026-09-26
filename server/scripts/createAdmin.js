import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Script to ensure default admin credentials in Aiven Cloud MySQL database.
 */
const CLOUD_DB_URL = process.env.DATABASE_URL;

if (!CLOUD_DB_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is required.');
  console.error('Usage: DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<db>?ssl-mode=REQUIRED" node scripts/createAdmin.js');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: CLOUD_DB_URL,
    },
  },
});

async function main() {
  console.log('Connecting to Cloud MySQL database...');
  console.log(`Endpoint: ${CLOUD_DB_URL.replace(/:[^:@]+@/, ':****@')}`);

  try {
    await prisma.$connect();
    console.log(' Connected to Aiven Cloud MySQL database.');

    // 1. Check existing ADMIN records
    const existingAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumberOrEmpId: true,
        role: true,
        isActive: true,
      },
    });

    console.log(`Found ${existingAdmins.length} existing SUPER_ADMIN account(s):`);
    existingAdmins.forEach((adm) => {
      console.log(`  - [ID: ${adm.id}] ${adm.name} (${adm.email}) | Role: ${adm.role}`);
    });

    // 2. Check or create requested admin account (admin@ssism.ac.in / admin123)
    const targetEmail = 'admin@ssism.ac.in';
    const targetPassword = 'admin123';

    let targetAdmin = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (targetAdmin) {
      console.log(`\n Account '${targetEmail}' already exists in database (ID: ${targetAdmin.id}).`);
    } else {
      console.log(`\n Creating default admin user '${targetEmail}'...`);
      
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(targetPassword, salt);

      // Find an existing department to associate, if any
      const department = await prisma.department.findFirst({
        select: { id: true, name: true },
      });

      targetAdmin = await prisma.user.create({
        data: {
          name: 'System Administrator (SSISM)',
          email: targetEmail,
          passwordHash: passwordHash,
          rollNumberOrEmpId: 'EMP-ADM-000',
          role: 'SUPER_ADMIN',
          designation: 'Chief System Administrator & IT Head',
          phone: '+91 98765 00000',
          aadhaarNumber: '1111-2222-3333',
          address: 'Administrative Block, SSISM Campus, Sandalpur',
          departmentId: department ? department.id : null,
          isActive: true,
        },
      });

      console.log(` Successfully created admin user: ${targetAdmin.email} (ID: ${targetAdmin.id})`);
    }

    // 3. Final summary of available admin credentials
    console.log('\n======================================================');
    console.log(' DEFAULT ADMIN LOGIN CREDENTIALS FOR TESTING');
    console.log('======================================================');
    console.log(`Email:    ${targetEmail}`);
    console.log(`Password: ${targetPassword}`);
    console.log(`Role:     SUPER_ADMIN`);
    console.log('------------------------------------------------------');
    console.log('Alternative Super Admin (From Seed Data):');
    console.log('Email:    superadmin@ssism.edu');
    console.log('Password: Admin@123');
    console.log('Role:     SUPER_ADMIN');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Error executing admin script:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
