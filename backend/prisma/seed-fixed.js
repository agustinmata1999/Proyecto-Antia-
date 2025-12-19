"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting seed with proper ObjectIds...');
    const now = new Date();
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const tipsterPasswordHash = await bcrypt.hash('Tipster123!', 10);
    const clientPasswordHash = await bcrypt.hash('Client123!', 10);
    console.log('Clearing existing data...');
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
    console.log('Creating users...');
    const adminResult = await prisma.$runCommandRaw({
        insert: 'users',
        documents: [{
                email: 'admin@antia.com',
                phone: '+34600000000',
                password_hash: adminPasswordHash,
                role: 'SUPERADMIN',
                status: 'ACTIVE',
                created_at: { $date: now.toISOString() },
                updated_at: { $date: now.toISOString() },
            }],
    });
    console.log('✅ Created SuperAdmin:', adminResult);
    const tipsterResult = await prisma.$runCommandRaw({
        insert: 'users',
        documents: [{
                email: 'fausto.perez@antia.com',
                phone: '+34611111111',
                password_hash: tipsterPasswordHash,
                role: 'TIPSTER',
                status: 'ACTIVE',
                created_at: { $date: now.toISOString() },
                updated_at: { $date: now.toISOString() },
            }],
    });
    console.log('✅ Created Tipster:', tipsterResult);
    const tipsterUser = await prisma.user.findUnique({
        where: { email: 'fausto.perez@antia.com' },
    });
    if (tipsterUser) {
        console.log('Found tipster with ID:', tipsterUser.id);
        await prisma.$runCommandRaw({
            insert: 'tipster_profiles',
            documents: [{
                    user_id: tipsterUser.id,
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
    }
    const clientResult = await prisma.$runCommandRaw({
        insert: 'users',
        documents: [{
                email: 'cliente@example.com',
                phone: '+34622222222',
                password_hash: clientPasswordHash,
                role: 'CLIENT',
                status: 'ACTIVE',
                created_at: { $date: now.toISOString() },
                updated_at: { $date: now.toISOString() },
            }],
    });
    console.log('✅ Created Client:', clientResult);
    const clientUser = await prisma.user.findUnique({
        where: { email: 'cliente@example.com' },
    });
    if (clientUser) {
        console.log('Found client with ID:', clientUser.id);
        await prisma.$runCommandRaw({
            insert: 'client_profiles',
            documents: [{
                    user_id: clientUser.id,
                    country_iso: 'ES',
                    consent_18: true,
                    consent_terms: true,
                    consent_privacy: true,
                    created_at: { $date: now.toISOString() },
                    updated_at: { $date: now.toISOString() },
                }],
        });
        console.log('✅ Created Client Profile');
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
//# sourceMappingURL=seed-fixed.js.map