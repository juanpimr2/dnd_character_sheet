const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = './data';
const EVENTS_DIR = './data/events';

// Crear directorios
[DATA_DIR, EVENTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

function serveFile(filePath, contentType, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, {'Content-Type': contentType});
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Archivos estáticos
    if (pathname === '/' || pathname === '/index.html') {
        serveFile('./index.html', 'text/html', res);
        return;
    }
    
    if (pathname === '/styles.css' || pathname === '/style.css') {
        serveFile('./styles.css', 'text/css', res);
        return;
    }
    
    if (pathname === '/character.js') {
        serveFile('./character.js', 'application/javascript', res);
        return;
    }
    
    // API: Guardar personaje
    if (pathname === '/api/save' && req.method === 'POST') {
        const playerId = query.player;
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                fs.writeFileSync(path.join(DATA_DIR, `${playerId}.json`), JSON.stringify(data, null, 2));
                console.log(`✓ Guardado: ${playerId}`);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success: true}));
            } catch (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: err.message}));
            }
        });
        return;
    }
    
    // API: Cargar personaje
    if (pathname === '/api/load' && req.method === 'GET') {
        const playerId = query.player;
        const filename = path.join(DATA_DIR, `${playerId}.json`);
        
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(data);
        } else {
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({error: 'Not found'}));
        }
        return;
    }
    
    // API: Guardar evento
    if (pathname === '/api/event' && req.method === 'POST') {
        const playerId = query.player;
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const eventData = JSON.parse(body);
                const filename = path.join(EVENTS_DIR, `${playerId}_events.txt`);
                const eventText = `[${eventData.timestamp}] ${eventData.text}\n`;
                
                if (!fs.existsSync(filename)) {
                    const header = `EVENTOS - ${eventData.charName}\n${eventData.charClasses}\n\n`;
                    fs.writeFileSync(filename, header);
                }
                
                fs.appendFileSync(filename, eventText);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success: true}));
            } catch (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: err.message}));
            }
        });
        return;
    }
    
    // API: Exportar
    if (pathname === '/api/export' && req.method === 'GET') {
        const playerId = query.player;
        const filename = path.join(DATA_DIR, `${playerId}.json`);
        
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${playerId}_${Date.now()}.json"`
            });
            res.end(data);
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
        return;
    }
    
    // API: Importar
    if (pathname === '/api/import' && req.method === 'POST') {
        const playerId = query.player;
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                fs.writeFileSync(path.join(DATA_DIR, `${playerId}.json`), JSON.stringify(data, null, 2));
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({success: true}));
            } catch (err) {
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(JSON.stringify({error: 'Invalid JSON'}));
            }
        });
        return;
    }
    
    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎲 Servidor D&D corriendo en puerto ${PORT}`);
    console.log(`📍 Accede en: https://tu-repl.replit.app?player=NOMBRE`);
});
