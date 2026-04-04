const { initGameState } = require('./gameLogic');

const rooms = {};

function createRoom(roomId) {
  rooms[roomId] = { id: roomId, players: [], state: 'waiting', gameState: null };
  return rooms[roomId];
}

function joinRoom(roomId, playerId, socket) {
  if (!rooms[roomId]) createRoom(roomId);
  const room = rooms[roomId];

  if (room.players.length >= 2) return { error: 'Room pleine' };
  if (room.players.find(p => p.id === playerId)) return { error: 'Déjà dans la room' };

  room.players.push({ id: playerId, socket });

  if (room.players.length === 2) {
    room.state     = 'playing';
    room.gameState = initGameState(room.players);
  }

  return { room, playerIndex: room.players.length - 1 };
}

function leaveRoom(roomId, playerId) {
  const room = rooms[roomId];
  if (!room) return;
  room.players = room.players.filter(p => p.id !== playerId);
  if (room.players.length === 0) delete rooms[roomId];
  else room.state = 'waiting';
}

function getRoom(roomId) { return rooms[roomId] || null; }

module.exports = { joinRoom, leaveRoom, getRoom };
