const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_URL = process.env.API_URL;

// Simulated mode message
const SIMULATED_MODE = process.env.BOT_TOKEN.includes('SIMULATED');

if (SIMULATED_MODE) {
  console.log('🤖 Bot running in SIMULATED mode');
  console.log('⚠️  To use real Telegram bot:');
  console.log('   1. Create bot with @BotFather');
  console.log('   2. Update BOT_TOKEN in /app/bot/.env');
  console.log('   3. Restart bot: sudo supervisorctl restart bot');
}

// Commands
bot.start((ctx) => {
  const message = `
🎉 ¡Bienvenido a Antia!

Soy tu asistente para gestionar tus pronósticos y suscripciones.

📋 Comandos disponibles:
/acceder - Acceder a tus canales
/mis_compras - Ver historial de compras
/renovar - Renovar suscripciones
/mi_cuenta - Gestionar tu cuenta
/soporte - Abrir ticket de soporte
/legales - Ver términos y condiciones

⚠️ +18 | Juega con responsabilidad
  `;

  ctx.reply(message, Markup.keyboard([
    ['🔑 Acceder', '🛒 Mis Compras'],
    ['🔄 Renovar', '👤 Mi Cuenta'],
    ['💬 Soporte', '📋 Legales']
  ]).resize());
});

bot.command('acceder', (ctx) => {
  ctx.reply(
    '🔑 Para acceder a tus canales premium:\n\n' +
    '1. Realiza tu compra en la web\n' +
    '2. Recibirás un link de acceso\n' +
    '3. Haz clic en el link para unirte\n\n' +
    'Si ya compraste y no tienes acceso, usa /soporte'
  );
});

bot.command('mis_compras', async (ctx) => {
  const telegramUserId = ctx.from.id;
  
  try {
    const response = await axios.post(`${API_URL}/bot/sync-purchase`, {
      telegram_user_id: telegramUserId.toString()
    });
    
    ctx.reply(
      '🛒 Mis Compras:\n\n' +
      'No tienes compras registradas aún.\n\n' +
      'Para comprar pronósticos visita:\n' +
      'https://bet-dashboard-11.preview.emergentagent.com'
    );
  } catch (error) {
    console.error('Error fetching orders:', error);
    ctx.reply('Error al obtener tus compras. Intenta más tarde.');
  }
});

bot.command('renovar', (ctx) => {
  ctx.reply(
    '🔄 Renovar Suscripción:\n\n' +
    'Para renovar tu suscripción, visita tu panel de cliente en:\n' +
    'https://bet-dashboard-11.preview.emergentagent.com/dashboard/client'
  );
});

bot.command('mi_cuenta', (ctx) => {
  ctx.reply(
    '👤 Mi Cuenta:\n\n' +
    `Telegram ID: ${ctx.from.id}\n` +
    `Usuario: @${ctx.from.username || 'Sin username'}\n\n` +
    'Gestiona tu cuenta en:\n' +
    'https://bet-dashboard-11.preview.emergentagent.com/dashboard/client/profile'
  );
});

bot.command('soporte', (ctx) => {
  ctx.reply(
    '💬 Soporte:\n\n' +
    '¿Necesitas ayuda? Contáctanos:\n\n' +
    '📧 Email: soporte@antia.com\n' +
    '📱 Teléfono: +34 900 000 000\n\n' +
    'O abre un ticket en tu panel'
  );
});

bot.command('legales', (ctx) => {
  ctx.reply(
    '📋 Información Legal:\n\n' +
    '⚠️ Este servicio es solo para mayores de 18 años\n\n' +
    '📄 Términos y Condiciones\n' +
    '🔒 Política de Privacidad\n' +
    '⚖️ Disclaimer de Responsabilidad\n\n' +
    'Juega con responsabilidad. Si tienes problemas con el juego, busca ayuda.'
  );
});

// Keyboard buttons
bot.hears('🔑 Acceder', (ctx) => ctx.reply('Usa /acceder para más información'));
bot.hears('🛒 Mis Compras', (ctx) => ctx.reply('Usa /mis_compras para ver tu historial'));
bot.hears('🔄 Renovar', (ctx) => ctx.reply('Usa /renovar para renovar tus suscripciones'));
bot.hears('👤 Mi Cuenta', (ctx) => ctx.reply('Usa /mi_cuenta para ver tu perfil'));
bot.hears('💬 Soporte', (ctx) => ctx.reply('Usa /soporte para contactar con soporte'));
bot.hears('📋 Legales', (ctx) => ctx.reply('Usa /legales para ver información legal'));

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('Ocurrió un error. Por favor intenta de nuevo.');
});

// Launch
if (SIMULATED_MODE) {
  console.log('✅ Bot ready (simulated mode)');
  console.log('📝 Commands: /start, /acceder, /mis_compras, /renovar, /mi_cuenta, /soporte, /legales');
  
  // Keep process running
  setInterval(() => {
    // Bot running in simulated mode
  }, 1000);
} else {
  bot.launch().then(() => {
    console.log('✅ Bot is running!');
  }).catch((err) => {
    console.error('Failed to start bot:', err);
    process.exit(1);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
