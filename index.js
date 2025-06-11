// npm install express http-proxy
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
const PORT = process.env.PORT || 3000;

/* 172.20.x.x 는 외부에 안 보이므로
   ① 로컬 박스에서만 실행하거나
   ② 터널/포트포워딩으로 접근 가능하게 만든 뒤
   createProxyMiddleware 로 그대로 릴레이 */
app.use('/video', createProxyMiddleware({
  target: 'http://172.20.50.20:8080',   // 카메라 MJPEG 원본
  changeOrigin: true,
  pathRewrite: { '^/video': '/video' }, // 필요 시 수정
  ws: false
}));

app.listen(PORT, () =>
  console.log(`🚀 MJPEG proxy on :${PORT}/video`)
);
