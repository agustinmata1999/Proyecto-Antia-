import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (skip if fresh database)
  try {
    await prisma.user.deleteMany().catch(() => {});
    await prisma.tipsterProfile.deleteMany().catch(() => {});
    await prisma.clientProfile.deleteMany().catch(() => {});
    await prisma.product.deleteMany().catch(() => {});
    await prisma.order.deleteMany().catch(() => {});
    await prisma.house.deleteMany().catch(() => {});
    await prisma.referralLink.deleteMany().catch(() => {});
    await prisma.referralEvent.deleteMany().catch(() => {});
    await prisma.config.deleteMany().catch(() => {});
  } catch (e) {
    console.log('📦 Fresh database, skipping cleanup');
  }

  // Create SuperAdmin
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@antia.com',
      phone: '+34600000000',
      passwordHash: await bcrypt.hash('Admin123!', 10),
      role: 'SUPERADMIN',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created SuperAdmin:', superAdmin.email);

  // Create Approved Tipster
  const tipsterUser = await prisma.user.create({
    data: {
      email: 'fausto.perez@antia.com',
      phone: '+34611111111',
      passwordHash: await bcrypt.hash('Tipster123!', 10),
      role: 'TIPSTER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created Tipster:', tipsterUser.email);

  const tipsterProfile = await prisma.tipsterProfile.create({
    data: {
      userId: tipsterUser.id,
      publicName: 'Fausto Perez',
      telegramUsername: '@faustoperez',
      payoutMethod: 'IBAN',
      payoutFields: {
        iban: 'ES1234567890123456789012',
        bankName: 'Banco Santander',
      },
    },
  });
  console.log('✅ Created Tipster Profile');

  // Create Client
  const clientUser = await prisma.user.create({
    data: {
      email: 'cliente@example.com',
      phone: '+34622222222',
      passwordHash: await bcrypt.hash('Client123!', 10),
      role: 'CLIENT',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created Client:', clientUser.email);

  await prisma.clientProfile.create({
    data: {
      userId: clientUser.id,
      countryIso: 'ES',
      consent18: true,
      consentTerms: true,
      consentPrivacy: true,
    },
  });
  console.log('✅ Created Client Profile');

  // Create Products
  const productOneTime = await prisma.product.create({
    data: {
      tipsterId: tipsterProfile.id,
      title: 'Pronóstico VIP - Partido del Sábado',
      description: 'Pronóstico exclusivo para el partido del fin de semana',
      priceCents: 2000, // 20 EUR
      currency: 'EUR',
      billingType: 'ONE_TIME',
      validityDays: 7,
      telegramChannelId: '@antia_vip_channel',
      active: true,
    },
  });
  console.log('✅ Created ONE_TIME Product:', productOneTime.title);

  const productSubscription = await prisma.product.create({
    data: {
      tipsterId: tipsterProfile.id,
      title: 'Suscripción Mensual VIP',
      description: 'Acceso completo a todos los pronósticos del mes',
      priceCents: 9900, // 99 EUR
      currency: 'EUR',
      billingType: 'SUBSCRIPTION',
      billingPeriod: 'MONTH',
      telegramChannelId: '@antia_premium_channel',
      active: true,
    },
  });
  console.log('✅ Created SUBSCRIPTION Product:', productSubscription.title);

  // Create Demo Houses
  const houseBwin = await prisma.house.create({
    data: {
      name: 'Bwin',
      method: 'API',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      apiBaseUrl: 'https://api.bwin.com/v1',
      credentials: {
        apiKey: 'bwin_demo_key',
        apiSecret: 'bwin_demo_secret',
      },
      commissionRules: {
        cpa: { register: 5000, ftd: 15000 },
        revshare: { percentage: 25 },
        type: 'HYBRID',
      },
      validationWindowDays: 30,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created House:', houseBwin.name);

  const houseBet365 = await prisma.house.create({
    data: {
      name: 'Bet365',
      method: 'CSV',
      timezone: 'Europe/Madrid',
      currency: 'EUR',
      commissionRules: {
        cpa: { register: 3000, ftd: 10000 },
        type: 'CPA',
      },
      validationWindowDays: 30,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created House:', houseBet365.name);

  // Create Referral Links
  await prisma.referralLink.create({
    data: {
      tipsterId: tipsterProfile.id,
      houseId: houseBwin.id,
      urlTemplate: 'https://bwin.com/register?aff={SUBID}',
      subidParamName: 'aff',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Created Referral Link for Bwin');

  // Create Demo Referral Events
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const eventDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const types = ['CLICK', 'REGISTER', 'FTD', 'DEPOSIT'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    await prisma.referralEvent.create({
      data: {
        houseId: houseBwin.id,
        tipsterId: tipsterProfile.id,
        subid: `subid_${i}`,
        userExtId: `user_ext_${i}`,
        type,
        amountCents: type === 'DEPOSIT' ? Math.floor(Math.random() * 50000) : type === 'FTD' ? 10000 : undefined,
        currency: 'EUR',
        eventAt: eventDate,
        source: 'API',
        status: 'VALID',
        rawPayload: {
          event_id: `evt_${i}`,
          timestamp: eventDate.toISOString(),
        },
      },
    });
  }
  console.log('✅ Created 10 Demo Referral Events');

  // Create Config
  await prisma.config.create({
    data: {
      key: 'PLATFORM_NAME',
      valueJson: { value: 'Antia' },
    },
  });
  await prisma.config.create({
    data: {
      key: 'DEFAULT_CURRENCY',
      valueJson: { value: 'EUR' },
    },
  });
  console.log('✅ Created Configs');

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
