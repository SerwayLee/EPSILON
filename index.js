// server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let queue = [];

app.post('/receive', (req, res) => {
  const { sentence } = req.body;
  if (!sentence) return res.status(400).json({ status:'error', message:'No sentence provided' });
  console.log('[RECEIVE]', sentence);
  queue.push(sentence);
  return res.json({ status:'ok' });
});

app.get('/request', (req, res) => {
  // 쌓인 문장들을 한 번에 반환하고 큐는 비웁니다
  const messages = queue.slice();
  queue = [];
  console.log('[REQUEST] sending', messages.length, 'items');
  return res.json({ sentences: messages });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
