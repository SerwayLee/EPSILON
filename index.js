const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

const rooms = {};
let allNames = [];
let usedNames = new Set();

function loadNames() {
  try {
    const data = fs.readFileSync('famous_people_expanded.txt', 'utf8');
    allNames = data.split('\n').map(name => name.trim()).filter(Boolean);
  } catch (error) {
    console.error("Error loading names file:", error);
  }
}

function getUniquePersonName() {
  if (usedNames.size >= allNames.length) {
    usedNames.clear(); 
  }
  
  let name;
  do {
    name = allNames[Math.floor(Math.random() * allNames.length)];
  } while (usedNames.has(name));
  
  usedNames.add(name);
  return name;
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/createRoom', (req, res) => {
  const roomId = generateRoomId();
  rooms[roomId] = {
    players: [],
    messages: [],
    currentTurnIndex: 0,
    turnsSkipped: 0,
    gameStarted: false,
    passVotes: 0,
    winner: null,
  };
  res.json({ roomId });
});

app.post('/joinRoom', (req, res) => {
  const { roomId, nickname } = req.body;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.players.length >= 4) {
    return res.status(403).json({ error: 'Room is full' });
  }

  const personName = getUniquePersonName();
  const playerId = uuidv4();
  room.players.push({ id: playerId, nickname, person: personName, isGuessed: false });

  res.json({ playerId, gameStarted: room.gameStarted });
});

app.post('/startGame', (req, res) => {
  const { roomId } = req.body;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.players.length < 2) {
    return res.status(400).json({ error: 'At least two players are required to start the game' });
  }

  room.gameStarted = true;

  const visiblePlayers = room.players.map(player => {
    return {
      id: player.id,
      nickname: player.nickname,
      person: player.person,
    };
  });

  res.json({ gameStarted: true, visiblePlayers });
});

app.post('/askQuestion', (req, res) => {
  const { roomId, playerId, question } = req.body;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.players[room.currentTurnIndex].id !== playerId) {
    return res.status(403).json({ error: 'Not your turn to ask a question.' });
  }

  const player = room.players.find(p => p.id === playerId);
  room.messages.push({ nickname: player.nickname, content: question, type: 'question' });
  room.passVotes = 0; 
  res.json({ question: `${player.nickname}: ${question}`, playerId });
});

app.post('/sendAnswer', (req, res) => {
  const { roomId, playerId, answer } = req.body;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const player = room.players.find(p => p.id === playerId);
  room.messages.push({ nickname: player.nickname, content: answer, type: 'answer' });

  res.json({ answer: `${player.nickname}: ${answer}`, playerId });
});

app.post('/attemptAnswer', (req, res) => {
  const { roomId, playerId, guess } = req.body;
  const room = rooms[roomId];
  const player = room.players.find((p) => p.id === playerId);

  if (!player) return res.status(404).json({ error: 'Player not found' });

  room.messages.push({ nickname: player.nickname, content: guess, type: 'guess' });

  if (guess === player.person) {
    room.winner = player; 
    res.json({ winner: playerId, message: `${player.nickname}님이 승리하셨습니다!` });
  } else {
    res.json({ incorrect: true, message: `${player.nickname}: 틀린 추측 - ${guess}` });
  }
});

app.post('/passTurn', (req, res) => {
    const { roomId, playerId } = req.body;
    const room = rooms[roomId];
    if (!room) return res.status(404).json({ error: 'Room not found' });
  
    if (room.players[room.currentTurnIndex].id === playerId) {
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
      room.passVotes = 0;
      const nextTurnPlayer = room.players[room.currentTurnIndex];
      
      room.messages.push({ nickname: "System", content: `턴이 ${nextTurnPlayer.nickname}님에게로 넘어갔습니다.` });
  
      res.json({ turnPassed: true, nextTurn: nextTurnPlayer.nickname });
    } else {
      room.passVotes += 1;
      if (room.passVotes >= room.players.length - 1) {
        room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;
        room.passVotes = 0;
        const nextTurnPlayer = room.players[room.currentTurnIndex];
        
        room.messages.push({ nickname: "System", content: `턴이 ${nextTurnPlayer.nickname}님에게로 넘어갔습니다.` });
        
        res.json({ turnPassed: true, nextTurn: nextTurnPlayer.nickname });
      } else {
        res.json({ turnPassed: false });
      }
    }
  });
  

app.get('/roomStatus', (req, res) => {
  const { roomId, playerId } = req.query;
  const room = rooms[roomId];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const visiblePlayers = room.players
    .filter(p => p.id !== playerId)
    .map(p => ({ nickname: p.nickname, person: p.person }));

  res.json({
    players: room.players.map(p => ({ id: p.id, nickname: p.nickname })),
    messages: room.messages,
    currentTurn: room.players[room.currentTurnIndex]?.nickname || "알 수 없음",
    currentTurnIndex: room.currentTurnIndex,
    visiblePlayers,
    gameStarted: room.gameStarted,
    winner: room.winner ? { nickname: room.winner.nickname, id: room.winner.id } : null
  });
});

loadNames();

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
