const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../public');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4' };

http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        return response.end();
    }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); return response.end(); }
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
        response.writeHead(403);
        return response.end();
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        if (path.extname(pathname) || pathname.startsWith('/api/')) {
            response.writeHead(404);
            return response.end();
        }
        file = path.join(root, 'index.html');
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (request.method === 'HEAD') return response.end();
    const stream = fs.createReadStream(file);
    stream.on('error', () => response.destroy());
    stream.pipe(response);
}).listen(Number(process.env.PORT || 5174), '127.0.0.1', () => {
    console.log(`RC's preview: http://127.0.0.1:${process.env.PORT || 5174}`);
});
