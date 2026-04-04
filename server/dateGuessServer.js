const { createRoom, getRoom, deleteRoom, DEFAULT_SETTINGS } = require('./dateGuessRoom');

function initDateGuessGame(io) {
  const nsp = io.of('/dg');

  function startRoundTimer(room) {
    if (room.timer) clearTimeout(room.timer);

    const duration = room.settings.timePerRound * 1000;
    const hintAt = Math.floor(duration * 0.5);

    // Hint halfway through
    if (room.settings.showHints) {
      room.hintTimer = setTimeout(() => {
        const img = room.images[room.currentRound];
        if (img && room.state === 'playing') {
          const decade = Math.floor(img.year / 10) * 10;
          room.broadcast('dg:hint', { hint: img.hint, decade });
        }
      }, hintAt);
    }

    // Tick every second
    let remaining = room.settings.timePerRound;
    room.tickInterval = setInterval(() => {
      remaining--;
      room.broadcast('dg:tick', { remaining });
      if (remaining <= 0) clearInterval(room.tickInterval);
    }, 1000);

    // Round end
    room.timer = setTimeout(() => {
      clearInterval(room.tickInterval);
      if (room.state === 'playing') endRound(room);
    }, duration);
  }

  function endRound(room) {
    if (room.timer) clearTimeout(room.timer);
    if (room.tickInterval) clearInterval(room.tickInterval);

    const roundData = room.resolveRound();
    room.broadcast('dg:round_end', {
      ...roundData,
      isLastRound: room.isLastRound(),
      round: room.currentRound + 1,
      totalRounds: room.images.length,
    });
  }

  function nextRound(room) {
    room.startRound();
    const img = room.currentImagePublic();
    room.broadcast('dg:round_start', {
      round: room.currentRound + 1,
      totalRounds: room.images.length,
      image: img,
      timeLimit: room.settings.timePerRound,
      minYear: room.settings.minYear,
      maxYear: room.settings.maxYear,
    });
    startRoundTimer(room);
  }

  nsp.on('connection', (socket) => {
    console.log(`[DG] +${socket.id}`);

    // ── Créer une room ──────────────────────────────────────────
    socket.on('dg:create', ({ nickname, avatar, settings }) => {
      if (!nickname?.trim()) return socket.emit('dg:error', { message: 'Pseudo requis' });

      const room = createRoom(socket.id, {
        nickname: nickname.trim().slice(0, 20),
        avatar,
        socket,
      }, settings || {});

      socket.join(room.code);
      socket.data.dgRoom = room.code;
      socket.data.dgNickname = nickname.trim();

      socket.emit('dg:created', {
        roomCode: room.code,
        players: room.publicPlayers(),
        settings: room.settings,
        isHost: true,
      });
    });

    // ── Rejoindre une room ──────────────────────────────────────
    socket.on('dg:join', ({ roomCode, nickname, avatar }) => {
      if (!nickname?.trim()) return socket.emit('dg:error', { message: 'Pseudo requis' });

      const room = getRoom(roomCode);
      if (!room) return socket.emit('dg:error', { message: 'Room introuvable — vérifie le code' });
      if (room.state !== 'lobby') return socket.emit('dg:error', { message: 'Partie déjà en cours' });
      if (room.players.size >= room.settings.maxPlayers) return socket.emit('dg:error', { message: 'Room pleine' });

      const nick = nickname.trim().slice(0, 20);
      room.addPlayer(socket.id, { nickname: nick, avatar, socket });
      socket.join(room.code);
      socket.data.dgRoom = room.code;
      socket.data.dgNickname = nick;

      socket.emit('dg:joined', {
        roomCode: room.code,
        players: room.publicPlayers(),
        settings: room.settings,
        isHost: false,
      });

      // Notifier les autres
      socket.to(room.code).emit('dg:player_joined', {
        player: { id: socket.id, nickname: nick, avatar, score: 0, roundScores: [], isHost: false, hasGuessed: false, connected: true },
        players: room.publicPlayers(),
      });
    });

    // ── Mettre à jour les paramètres (hôte seulement) ──────────
    socket.on('dg:settings', (settings) => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.state !== 'lobby') return;

      const allowed = ['numRounds', 'timePerRound', 'difficulty', 'showHints', 'maxPlayers', 'minYear', 'maxYear'];
      for (const key of allowed) {
        if (settings[key] !== undefined) room.settings[key] = settings[key];
      }
      room.broadcast('dg:settings_updated', { settings: room.settings });
    });

    // ── Lancer la partie (hôte seulement) ───────────────────────
    socket.on('dg:start', () => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.state !== 'lobby') return;
      if (room.players.size < 1) return socket.emit('dg:error', { message: 'Il faut au moins 1 joueur' });

      room.startGame();
      room.broadcast('dg:game_started', { totalRounds: room.images.length });

      // Petit délai avant le premier round
      setTimeout(() => nextRound(room), 1500);
    });

    // ── Soumettre une réponse ───────────────────────────────────
    socket.on('dg:guess', ({ year, month }) => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.state !== 'playing') return;

      const y = parseInt(year);
      if (isNaN(y) || y < 100 || y > 2100) return;

      const submitted = room.submitGuess(socket.id, y, month ? parseInt(month) : null);
      if (!submitted) return;

      // Notifier les autres qu'un joueur a répondu (sans révéler la réponse)
      room.broadcast('dg:player_guessed', {
        playerId: socket.id,
        players: room.publicPlayers(),
      });

      // Si tout le monde a répondu, terminer le round immédiatement
      if (room.allGuessed()) endRound(room);
    });

    // ── Round suivant (hôte valide manuellement) ─────────────────
    socket.on('dg:next', () => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.state !== 'round_end') return;

      if (room.isLastRound()) {
        room.state = 'game_end';
        room.broadcast('dg:game_end', { ranking: room.getFinalRanking() });
      } else {
        nextRound(room);
      }
    });

    // ── Stopper la partie et retourner au lobby (hôte) ──────────
    socket.on('dg:stop', () => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.timer) clearTimeout(room.timer);
      if (room.tickInterval) clearInterval(room.tickInterval);
      if (room.hintTimer) clearTimeout(room.hintTimer);
      room.state = 'lobby';
      room.currentRound = -1;
      room.images = [];
      room.guesses.clear();
      for (const p of room.players.values()) { p.score = 0; p.roundScores = []; }
      room.broadcast('dg:lobby', { players: room.publicPlayers(), settings: room.settings });
    });

    // ── Kick un joueur (hôte, lobby uniquement) ──────────────────
    socket.on('dg:kick', ({ playerId }) => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.hostId !== socket.id) return;
      if (playerId === socket.id) return; // cannot kick yourself
      const target = room.players.get(playerId);
      if (!target) return;
      target.socket.emit('dg:kicked', { message: 'Tu as été exclu de la room par l\'hôte.' });
      room.removePlayer(playerId);
      room.broadcast('dg:player_left', { playerId, players: room.publicPlayers() });
    });

    // ── Rejouer (hôte) ──────────────────────────────────────────
    socket.on('dg:replay', () => {
      const room = getRoom(socket.data.dgRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.state !== 'game_end') return;

      room.state = 'lobby';
      room.currentRound = -1;
      room.images = [];
      room.guesses.clear();
      for (const p of room.players.values()) { p.score = 0; p.roundScores = []; }
      room.broadcast('dg:lobby', { players: room.publicPlayers(), settings: room.settings });
    });

    // ── Déconnexion ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      const roomCode = socket.data.dgRoom;
      if (!roomCode) return;
      const room = getRoom(roomCode);
      if (!room) return;

      const result = room.removePlayer(socket.id);
      console.log(`[DG] -${socket.id} room=${roomCode}`);

      if (room.players.size === 0) {
        deleteRoom(roomCode);
        return;
      }

      const payload = { playerId: socket.id, players: room.publicPlayers() };
      if (result.newHostId) payload.newHostId = result.newHostId;
      nsp.to(roomCode).emit('dg:player_left', payload);

      // Si tout le monde restant a deviné, finir le round
      if (room.state === 'playing' && room.allGuessed()) endRound(room);
    });
  });
}

module.exports = { initDateGuessGame };
