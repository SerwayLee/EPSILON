const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let queue = [];

app.post('/receive', (req, res) => {
  const { sentence } = req.body;
  if (!sentence) {
    return res.status(400).json({ status: 'error', message: 'No sentence provided' });
  }
  queue.push(sentence);
  return res.json({ status: 'ok' });
});

app.get('/request', (req, res) => {
  const toSend = queue.slice();  
  queue = [];
  return res.json({ sentences: toSend });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
