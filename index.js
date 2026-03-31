require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

const PORT = process.env.PORT || 10000;

// Servidor HTTP para Render
app.get('/', (req, res) => {
  res.send('🤖 Bot de Pergaminos corriendo en Render. Usa Telegram para interactuar.');
});
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Servidor HTTP en puerto ${PORT} (para Render)`);
});

// Función para buscar libros en Gutendex
async function buscarLibros(query, idioma = 'es') {
  try {
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=${idioma}`;
    const response = await axios.get(url);
    return response.data.results.slice(0, 5); // Devolver hasta 5 libros
  } catch (error) {
    console.error('Error en búsqueda:', error.message);
    return [];
  }
}

// Comando /start
bot.start((ctx) => {
  ctx.reply('📖 ¡Hola! Soy el bot de PergaminosAbiertos.\n\nEscribe /buscar seguido del título de un libro y te ayudaré a encontrarlo en bibliotecas públicas.\n\nEjemplo: /buscar Don Quijote');
});

// Comando /buscar (AHORA CON BÚSQUEDA REAL)
bot.command('buscar', async (ctx) => {
  const query = ctx.message.text.replace('/buscar ', '').trim();
  
  if (!query) {
    return ctx.reply('📚 Escribe: /buscar [título del libro]\n\nEjemplo: /buscar Cien años de soledad');
  }
  
  // Mensaje de "buscando..."
  const waitingMsg = await ctx.reply(`🔍 Buscando "${query}" en bibliotecas públicas...`);
  
  const libros = await buscarLibros(query);
  
  if (libros.length === 0) {
    return ctx.reply(`❌ No encontré libros para "${query}".\n\nPrueba con otro título o autor.`);
  }
  
  // Crear la lista de resultados
  let respuesta = `📚 *Resultados para "${query}"*:\n\n`;
  
  libros.forEach((libro, index) => {
    const titulo = libro.title || 'Título desconocido';
    const autor = libro.authors[0]?.name || 'Autor desconocido';
    const anio = libro.authors[0]?.birth_year || '?';
    // Buscar un formato válido (epub, pdf, text, etc.)
const formatosDisponibles = libro.formats || {};
const formatosPrioridad = ['application/epub+zip', 'text/plain', 'text/html', 'application/pdf'];
let enlace = '#';
let formatoNombre = 'texto';

for (const fmt of formatosPrioridad) {
  if (formatosDisponibles[fmt]) {
    enlace = formatosDisponibles[fmt];
    formatoNombre = fmt.includes('epub') ? 'EPUB' : fmt.includes('pdf') ? 'PDF' : 'Texto';
    break;
  }
}
    
    respuesta += `${index + 1}. *${titulo}*\n`;
    respuesta += `   👤 Autor: ${autor}\n`;
    respuesta += `   📅 Año: ${anio}\n`;
    respuesta += `   📖 Leer: [${formato}](${enlace})\n\n`;
  });
  
  respuesta += `🔗 Fuente: Project Gutenberg (Gutendex)`;
  
  // Editar el mensaje de "buscando..." con los resultados
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    waitingMsg.message_id,
    null,
    respuesta,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
});

// Comando /help
bot.command('help', (ctx) => {
  ctx.reply('Comandos disponibles:\n\n/start - Mensaje de bienvenida\n/buscar [título] - Buscar un libro en bibliotecas públicas\n/help - Este mensaje');
});

// Manejo de errores
bot.catch((err, ctx) => {
  console.error(`Error para ${ctx.updateType}:`, err);
  ctx.reply('⚠️ Ocurrió un error. Por favor intenta de nuevo.');
});

// Iniciar el bot con polling
bot.launch({
  polling: {
    timeout: 30,
    limit: 100,
    retryTimeout: 5000
  }
}).then(() => {
  console.log('✅ Bot de búsqueda iniciado correctamente (polling activo)');
}).catch((err) => {
  console.error('❌ Error al iniciar el bot:', err);
  process.exit(1);
});

// Cierre graceful
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