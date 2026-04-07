const { createRoom, getRoom, deleteRoom } = require('./flagRoom');

function initFlagGame(io) {
  const fg = io.of('/fg');

  fg.on('connection', (socket) => {

    const room = () => socket.data.fgRoom ? getRoom(socket.data.fgRoom) : null;

    socket.on('fg:create', ({ name, avatar }) => {
      const r = createRoom(socket.id);
      r.addPlayer(socket.id, socket, name, avatar);
      socket.data.fgRoom = r.code;
      socket.emit('fg:created', { roomCode: r.code, players: r.publicPlayers(), settings: r.settings, isHost: true });
    });

    socket.on('fg:join', ({ code, name, avatar }) => {
      const r = getRoom((code || '').toUpperCase());
      if (!r) return socket.emit('fg:error', { message: 'Room introuvable' });
      if (r.state !== 'lobby') return socket.emit('fg:error', { message: 'Partie déjà en cours' });
      if (r.players.size >= 10) return socket.emit('fg:error', { message: 'Room pleine (max 10)' });
      r.addPlayer(socket.id, socket, name, avatar);
      socket.data.fgRoom = r.code;
      socket.emit('fg:joined', { roomCode: r.code, players: r.publicPlayers(), settings: r.settings, isHost: false });
      r.broadcast('fg:player_joined', { players: r.publicPlayers() });
    });

    socket.on('fg:settings', (settings) => {
      const r = room();
      if (!r || r.hostId !== socket.id) return;
      Object.assign(r.settings, settings);
      r.broadcast('fg:settings_updated', { settings: r.settings });
    });

    socket.on('fg:start', () => {
      const r = room();
      if (!r || r.hostId !== socket.id) return;
      if (r.players.size < 1) return socket.emit('fg:error', { message: 'Pas assez de joueurs' });
      r.startGame();
    });

    socket.on('fg:answer', ({ code }) => {
      const r = room();
      if (r) r.submitAnswer(socket.id, code);
    });

    socket.on('fg:next', () => {
      const r = room();
      if (r && r.hostId === socket.id) r.nextQuestion();
    });

    socket.on('fg:replay', () => {
      const r = room();
      if (!r || r.hostId !== socket.id) return;
      r.reset();
      r.broadcast('fg:lobby', { players: r.publicPlayers(), settings: r.settings });
    });

    socket.on('fg:kick', ({ playerId }) => {
      const r = room();
      if (!r || r.hostId !== socket.id) return;
      const target = r.players.get(playerId);
      if (!target || playerId === socket.id) return;
      target.socket.emit('fg:kicked', { message: 'Tu as été exclu de la room.' });
      r.removePlayer(playerId);
      r.broadcast('fg:player_left', { playerId, players: r.publicPlayers() });
    });

    socket.on('disconnect', () => {
      const r = room();
      if (!r) return;
      r.removePlayer(socket.id);
      if (r.players.size === 0) { deleteRoom(r.code); return; }
      r.broadcast('fg:player_left', { playerId: socket.id, players: r.publicPlayers() });
    });
  });
}

module.exports = { initFlagGame };
