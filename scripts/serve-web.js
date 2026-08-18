// 本地 Web 服务：为 expo export 产物加上跨源隔离头（COOP + COEP）。
// expo-sqlite 的 Web 版依赖 SharedArrayBuffer，浏览器要求这两个头才可用。
// 用法：npm run web:serve （先 export 再启动本服务）
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('未找到 dist/index.html，请先运行：npx expo export --platform web');
  process.exit(1);
}

http
  .createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    let filePath = path.join(DIST, url === '/' ? 'index.html' : url);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST, 'index.html'); // SPA 回退
    }
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`读书记录 App（Web）：http://localhost:${PORT}`);
  });
