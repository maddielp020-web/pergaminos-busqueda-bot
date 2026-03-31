require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const PORT = process.env.PORT || 10000;

// Servidor HTTP para Render
app.get('/', (req, res) => res.send('🤖 Bot de Pergaminos corriendo en Render.'));
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 Servidor HTTP en puerto ${PORT}`));

// Función de búsqueda mejorada
async function buscarLibros(query) {
    try {
        const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=es`;
        console.log(`🔍 Consultando: ${url}`);
        
        const response = await axios.get(url, { timeout: 15000 });
        const libros = response.data.results || [];
        
        console.log(`✅ Encontrados ${libros.length} libros`);
        
        // Formatear cada libro
        return libros.slice(0, 5).map(libro => {
            // Extraer el mejor enlace disponible
            const formats = libro.formats || {};
            let enlace = null;
            let formato = 'Texto';
            
            // Prioridad: EPUB > TXT > HTML > PDF
            if (formats['application/epub+zip']) {
                enlace = formats['application/epub+zip'];
                formato = '📱 EPUB';
            } else if (formats['text/plain; charset=utf-8']) {
                enlace = formats['text/plain; charset=utf-8'];
                formato = '📄 Texto';
            } else if (formats['text/plain']) {
                enlace = formats['text/plain'];
                formato = '📄 Texto';
            } else if (formats['text/html']) {
                enlace = formats['text/html'];
                formato = '🌐 HTML';
            } else if (formats['application/pdf']) {
                enlace = formats['application/pdf'];
                formato = '📑 PDF';
            } else {
                // Si hay algún otro formato, toma el primero
                const primerFormato = Object.keys(formats)[0];
                if (primerFormato) {
                    enlace = formats[primerFormato];
                    formato = '📖 Leer';
                }
            }
            
            const autor = libro.authors && libro.authors[0] 
                ? libro.authors[0].name 
                : 'Autor desconocido';
            
            const anio = libro.authors && libro.authors[0] && libro.authors[0].birth_year
                ? libro.authors[0].birth_year
                : '';
            
            return {
                titulo: libro.title || 'Título desconocido',
                autor: autor,
                anio: anio,
                enlace: enlace,
                formato: formato
            };
        });
        
    } catch (error) {
        console.error('❌ Error en buscarLibros:', error.message);
        return [];
    }
}

// Comando /start
bot.start((ctx) => {
    ctx.reply('📖 ¡Hola! Soy el bot de PergaminosAbiertos.\n\nEscribe /buscar seguido del título de un libro y te ayudaré a encontrarlo en bibliotecas públicas.\n\nEjemplo: /buscar Don Quijote');
});

// Comando /buscar
bot.command('buscar', async (ctx) => {
    const query = ctx.message.text.replace('/buscar ', '').trim();
    
    if (!query) {
        return ctx.reply('📚 Escribe: /buscar [título del libro]\n\nEjemplo: /buscar Cien años de soledad');
    }
    
    // Mensaje de "buscando..."
    const waitingMsg = await ctx.reply(`🔍 Buscando "${query}" en bibliotecas públicas...`);
    
    try {
        const libros = await buscarLibros(query);
        
        if (!libros || libros.length === 0) {
            return ctx.reply(`❌ No encontré libros para "${query}".\n\nPrueba con otro título o autor.`);
        }
        
        // Construir respuesta
        let respuesta = `📚 *Resultados para "${query}"*:\n\n`;
        
        for (let i = 0; i < libros.length; i++) {
            const libro = libros[i];
            respuesta += `${i+1}. *${libro.titulo}*\n`;
            respuesta += `   👤 ${libro.autor}`;
            if (libro.anio) respuesta += ` (${libro.anio})`;
            respuesta += `\n`;
            
            if (libro.enlace) {
                respuesta += `   ${libro.formato}: [Descargar](${libro.enlace})\n`;
            } else {
                respuesta += `   📖 Sin enlace disponible\n`;
            }
            respuesta += `\n`;
        }
        
        respuesta += `🔗 Fuente: Project Gutenberg (Gutendex)`;
        
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            waitingMsg.message_id,
            null,
            respuesta,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
        
    } catch (error) {
        console.error('❌ Error en comando buscar:', error);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            waitingMsg.message_id,
            null,
            `❌ Error al buscar "${query}".\n\nPor favor intenta de nuevo más tarde.`
        );
    }
});

// Comando /help
bot.command('help', (ctx) => {
    ctx.reply('Comandos disponibles:\n\n/start - Mensaje de bienvenida\n/buscar [título] - Buscar un libro\n/help - Este mensaje');
});

// Manejo de errores general
bot.catch((err, ctx) => {
    console.error('❌ Error general:', err);
    ctx.reply('⚠️ Ocurrió un error. Por favor intenta de nuevo.');
});

// Iniciar el bot
bot.launch({
    polling: {
        timeout: 30,
        limit: 100,
        retryTimeout: 5000
    }
}).then(() => {
    console.log('✅ Bot de búsqueda iniciado correctamente');
}).catch((err) => {
    console.error('❌ Error al iniciar el bot:', err);
    process.exit(1);
});

// Cierre graceful
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));