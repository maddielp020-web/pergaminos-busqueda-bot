require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Comandos básicos
bot.start((ctx) => {
  ctx.reply('📖 ¡Hola! Soy el bot de PergaminosAbiertos.\n\nEscribe /buscar seguido del título de un libro y te ayudaré a encontrarlo en bibliotecas públicas.\n\nEjemplo: /buscar Don Quijote');
});

bot.command('buscar', (ctx) => {
  const query = ctx.message.text.replace('/buscar ', '').trim();
  if (!query) {
    return ctx.reply('📚 Escribe: /buscar [título del libro]\n\nEjemplo: /buscar Cien años de soledad');
  }
  ctx.reply(`🔍 Buscando "${query}"...\n\n(Pronto agregaré la conexión a bibliotecas públicas. Por ahora esto es una prueba de que el bot funciona.)`);
});

bot.command('help', (ctx) => {
  ctx.reply('Comandos disponibles:\n\n/start - Mensaje de bienvenida\n/buscar [título] - Buscar un libro\n/help - Este mensaje');
});

// Manejo de errores para mantener el bot vivo
bot.catch((err, ctx) => {
  console.error(`Error para ${ctx.updateType}:`, err);
});

// Iniciar el bot con manejo de señales
bot.launch()
  .then(() => {
    console.log('✅ Bot de búsqueda iniciado correctamente');
  })
  .catch((err) => {
    console.error('❌ Error al iniciar el bot:', err);
    process.exit(1);
  });

// Mantener el proceso vivo
process.once('SIGINT', () => {
  console.log('🔴 Deteniendo bot...');
  bot.stop('SIGINT');
  process.exit(0);
});
process.once('SIGTERM', () => {
  console.log('🔴 Deteniendo bot...');
  bot.stop('SIGTERM');
  process.exit(0);
});

// Esto evita que el proceso termine inmediatamente
setInterval(() => {
  // Mantener el proceso vivo con un heartbeat
}, 60000);