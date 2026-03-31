require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const axios = require('axios');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('🤖 Bot de Pergaminos corriendo en Render.'));
app.get('/health', (req, res) => res.send('OK'));
app.listen(PORT, '0.0.0.0', () => console.log(`🌐 Servidor HTTP en puerto ${PORT}`));

async function buscarLibros(query) {
    try {
        const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=es`;
        console.log(`🔍 Consultando: ${url}`);
        
        const response = await axios.get(url, { timeout: 15000 });
        const libros = response.data.results || [];
        
        console.log(`✅ Encontrados ${libros.length} libros`);
        
        return libros.slice(0, 5).map(libro => {
            const formats = libro.formats || {};
            
            // Buscar enlaces en orden de prioridad universal
            let enlace = null;
            let formato = '📖 Leer';
            
            // Prioridad 1: HTML legible (funciona en cualquier navegador)
            if (formats['text/html; charset=utf-8']) {
                enlace = formats['text/html; charset=utf-8'];
                formato = '🌐 Leer online';
            } 
            // Prioridad 2: EPUB estándar
            else if (formats['application/epub+zip']) {
                enlace = formats['application/epub+zip'];
                formato = '📱 EPUB';
            }
            // Prioridad 3: Texto plano
            else if (formats['text/plain; charset=utf-8']) {
                enlace = formats['text/plain; charset=utf-8'];
                formato = '📄 Texto plano';
            }
            // Prioridad 4: Cualquier otro formato
            else {
                const primerFormato = Object.keys(formats)[0];
                if (primerFormato) {
                    enlace = formats[primerFormato];
                    formato = '📖 Leer';
                }
            }
            
            const autor = libro.authors && libro.authors[0] ? libro.authors[0].name : 'Autor desconocido';
            const anio = libro.authors && libro.authors[0] && libro.authors[0].birth_year ? libro.authors[0].birth_year : '';
            
            console.log(`📖 ${libro.title} → ${formato}: ${enlace}`);
            
            return {
                titulo: libro.title || 'Título desconocido',
                autor: autor,
                anio: anio,
                enlace: enlace,
                formato: formato,
                id: libro.id
            };
        });
        
    } catch (error) {
        console.error('❌ Error en buscarLibros:', error.message);
        return [];
    }
}

bot.start((ctx) => {
    ctx.reply('📖 ¡Hola! Soy el bot de PergaminosAbiertos.\n\nEscribe /buscar seguido del título de un libro.\n\nEjemplo: /buscar Don Quijote');
});

bot.command('buscar', async (ctx) => {
    const query = ctx.message.text.replace('/buscar ', '').trim();
    
    if (!query) {
        return ctx.reply('📚 Escribe: /buscar [título del libro]\n\nEjemplo: /buscar Cien años de soledad');
    }
    
    const waitingMsg = await ctx.reply(`🔍 Buscando "${query}" en bibliotecas públicas...`);
    
    try {
        const libros = await buscarLibros(query);
        
        if (!libros || libros.length === 0) {
            return ctx.reply(`❌ No encontré libros para "${query}".\n\nPrueba con otro título o autor.`);
        }
        
        let respuesta = `📚 *Resultados para "${query}"*:\n\n`;
        
        for (let i = 0; i < libros.length; i++) {
            const libro = libros[i];
            
            respuesta += `${i+1}. *${libro.titulo}*\n`;
            respuesta += `   👤 ${libro.autor}`;
            if (libro.anio) respuesta += ` (${libro.anio})`;
            respuesta += `\n`;
            
            if (libro.enlace) {
                respuesta += `   ${libro.formato}: [Abrir](${libro.enlace})\n`;
            } else {
                respuesta += `   📖 Sin enlace disponible\n`;
            }
            respuesta += `\n`;
        }
        
        respuesta += `🔗 Fuente: Project Gutenberg (Gutendex)\n\n📌 Los enlaces funcionan en cualquier dispositivo. Si usas iPhone, el EPUB se guarda en Archivos y se abre en Libros.`;
        
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            waitingMsg.message_id,
            null,
            respuesta,
            { parse_mode: 'Markdown', disable_web_page_preview: true }
        );
        
    } catch (error) {
        console.error('❌ Error:', error);
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            waitingMsg.message_id,
            null,
            `❌ Error al buscar "${query}".\n\nPor favor intenta de nuevo.`
        );
    }
});

bot.command('help', (ctx) => {
    ctx.reply('Comandos:\n/start\n/buscar [título]\n/help');
});

bot.catch((err, ctx) => {
    console.error('❌ Error general:', err);
});

bot.launch({
    polling: {
        timeout: 30,
        limit: 100,
        retryTimeout: 5000
    }
}).then(() => {
    console.log('✅ Bot iniciado');
}).catch((err) => {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));