import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to generate MongoDB ObjectId
function generateObjectId() {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16).padStart(8, '0');
  const randomValue = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  const machineId = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  return timestamp + machineId + randomValue + counter;
}

async function main() {
  console.log('🌱 Starting simple seed (MongoDB no replica set)...');

  // Generate ObjectIds
  const superAdminId = generateObjectId();
  const tipsterUserId = generateObjectId();
  const tipsterProfileId = generateObjectId();
  const clientUserId = generateObjectId();
  const clientProfileId = generateObjectId();

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  const tipsterPasswordHash = await bcrypt.hash('Tipster123!', 10);
  const clientPasswordHash = await bcrypt.hash('Client123!', 10);

  const now = new Date();

  // First, clear existing data
  try {
    await prisma.$runCommandRaw({
      delete: 'users',
      deletes: [{ q: {}, limit: 0 }],
    });
    await prisma.$runCommandRaw({
      delete: 'tipster_profiles',
      deletes: [{ q: {}, limit: 0 }],
    });
    await prisma.$runCommandRaw({
      delete: 'client_profiles',
      deletes: [{ q: {}, limit: 0 }],
    });
    console.log('✅ Cleared existing data');
  } catch (e) {
    console.log('ℹ️  Database already empty');
  }

  // Create SuperAdmin using $runCommandRaw with ObjectId
  try {
    await prisma.$runCommandRaw({
      insert: 'users',
      documents: [{
        _id: { $oid: superAdminId },
        email: 'admin@antia.com',
        phone: '+34600000000',
        password_hash: adminPasswordHash,
        role: 'SUPERADMIN',
        status: 'ACTIVE',
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created SuperAdmin: admin@antia.com');
  } catch (e) {
    console.log('⚠️  SuperAdmin might already exist');
  }

  // Create Tipster User
  try {
    await prisma.$runCommandRaw({
      insert: 'users',
      documents: [{
        _id: { $oid: tipsterUserId },
        email: 'fausto.perez@antia.com',
        phone: '+34611111111',
        password_hash: tipsterPasswordHash,
        role: 'TIPSTER',
        status: 'ACTIVE',
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Tipster: fausto.perez@antia.com');
  } catch (e) {
    console.log('⚠️  Tipster might already exist');
  }

  // Create Tipster Profile
  try {
    await prisma.$runCommandRaw({
      insert: 'tipster_profiles',
      documents: [{
        _id: { $oid: tipsterProfileId },
        user_id: tipsterUserId,
        public_name: 'Fausto Perez',
        telegram_username: '@faustoperez',
        payout_method: 'IBAN',
        payout_fields: {
          iban: 'ES1234567890123456789012',
          bankName: 'Banco Santander',
        },
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Tipster Profile');
  } catch (e) {
    console.log('⚠️  Tipster Profile might already exist');
  }

  // Create Client User
  try {
    await prisma.$runCommandRaw({
      insert: 'users',
      documents: [{
        _id: { $oid: clientUserId },
        email: 'cliente@example.com',
        phone: '+34622222222',
        password_hash: clientPasswordHash,
        role: 'CLIENT',
        status: 'ACTIVE',
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Client: cliente@example.com');
  } catch (e) {
    console.log('⚠️  Client might already exist');
  }

  // Create Client Profile
  try {
    await prisma.$runCommandRaw({
      insert: 'client_profiles',
      documents: [{
        _id: { $oid: clientProfileId },
        user_id: clientUserId,
        country_iso: 'ES',
        consent_18: true,
        consent_terms: true,
        consent_privacy: true,
        created_at: { $date: now.toISOString() },
        updated_at: { $date: now.toISOString() },
      }],
    });
    console.log('✅ Created Client Profile');
  } catch (e) {
    console.log('⚠️  Client Profile might already exist');
  }

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Created accounts:');
  console.log('  SuperAdmin: admin@antia.com / Admin123!');
  console.log('  Tipster: fausto.perez@antia.com / Tipster123!');
  console.log('  Client: cliente@example.com / Client123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
