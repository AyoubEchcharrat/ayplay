require('dotenv').config({ override: true }); // force l'utilisation du .env même si la var existe déjà
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');
const { initDateGuessGame } = require('./dateGuessServer');
const { initFlagGame }      = require('./flagServer');

const { joinRoom, leaveRoom, getRoom } = require('./gameRoom');
const {
  handlePlayCard,
  handleDeclareAttack,
  handleEndTurn,
  buildClientState,
} = require('./gameLogic');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// ── API RPG (génératif via Claude) ────────────────────────────────
const rpgRouter = require('./rpg');
app.use('/api/rpg', rpgRouter);

// ── Broadcast ─────────────────────────────────────────────────────────

function broadcastState(room) {
  room.players.forEach((player, idx) => {
    player.socket.emit('game_state_update', {
      myGameState: buildClientState(room.gameState, idx),
    });
  });
}

// ── Socket ────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // Rejoindre une room
  socket.on('join_room', ({ roomId }) => {
    const result = joinRoom(roomId, socket.id, socket);
    if (result.error) { socket.emit('error', { message: result.error }); return; }

    socket.join(roomId);
    socket.data.roomId       = roomId;
    socket.data.playerIndex  = result.playerIndex;

    const room = result.room;
    socket.emit('joined', { playerIndex: result.playerIndex, roomId, state: room.state });

    if (room.state === 'playing') {
      broadcastState(room);
      console.log(`[game_start] room=${roomId}`);
    } else {
      socket.emit('waiting', { message: 'En attente du 2ème joueur…' });
    }
  });

  // Jouer une carte (animal / terrain / état)
  socket.on('play_card', ({ cardIndex }) => {
    const { roomId, playerIndex } = socket.data;
    const room = getRoom(roomId);
    if (!room || room.state !== 'playing') return;

    const result = handlePlayCard(room.gameState, playerIndex, cardIndex);
    if (!result.ok) { socket.emit('action_error', { message: result.error }); return; }

    broadcastState(room);
  });

  // Déclarer une attaque
  socket.on('declare_attack', ({ attackerInstanceId, targetInstanceId }) => {
    const { roomId, playerIndex } = socket.data;
    const room = getRoom(roomId);
    if (!room || room.state !== 'playing') return;

    const result = handleDeclareAttack(room.gameState, playerIndex, attackerInstanceId, targetInstanceId);
    if (!result.ok) { socket.emit('action_error', { message: result.error }); return; }

    broadcastState(room);

    if (result.gameOver) {
      io.to(roomId).emit('game_over', { winner: result.winner });
      room.state = 'finished';
    }
  });

  // Fin de tour
  socket.on('end_turn', () => {
    const { roomId, playerIndex } = socket.data;
    const room = getRoom(roomId);
    if (!room || room.state !== 'playing') return;

    const result = handleEndTurn(room.gameState, playerIndex);
    if (!result.ok) { socket.emit('action_error', { message: result.error }); return; }

    broadcastState(room);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    const { roomId } = socket.data;
    if (!roomId) return;
    leaveRoom(roomId, socket.id);
    io.to(roomId).emit('opponent_left', { message: "L'adversaire a quitté la partie." });
    console.log(`[-] ${socket.id} room=${roomId}`);
  });
});

// ── FinDate (jeu de devinette de dates) ───────────────────────
initDateGuessGame(io);

// ── FlagRush (jeu de drapeaux multijoueur) ─────────────────────
initFlagGame(io);

// ── RiftBoard (jeu de plateau tactique) ────────────────────────
const { initRiftGame } = require('./riftServer');
initRiftGame(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur lancé → http://localhost:${PORT}`));
