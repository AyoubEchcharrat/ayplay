const { selectRandomImages, calculateScore } = require('./dateGuessData');

const rooms = new Map();

const DEFAULT_SETTINGS = {
  numRounds: 10,
  timePerRound: 30,
  difficulty: 'all',
  showHints: true,
  maxPlayers: 8,
  minYear: 1820,
  maxYear: 2024,
};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

class DateGuessRoom {
  constructor(code, hostId, hostData, settings = {}) {
    this.code = code;
    this.hostId = hostId;
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.players = new Map();
    this.state = 'lobby';   // lobby | playing | round_end | game_end
    this.images = [];
    this.currentRound = -1;
    this.guesses = new Map();
    this.timer = null;
    this.roundStartTime = null;
    this.addPlayer(hostId, hostData);
  }

  addPlayer(id, data) {
    this.players.set(id, {
      id,
      nickname: data.nickname,
      avatar: data.avatar,
      score: 0,
      roundScores: [],
      socket: data.socket,
      isHost: id === this.hostId,
      connected: true,
    });
  }

  removePlayer(id) {
    this.players.delete(id);
    if (id === this.hostId && this.players.size > 0) {
      this.hostId = [...this.players.keys()][0];
      this.players.get(this.hostId).isHost = true;
      return { newHostId: this.hostId };
    }
    return {};
  }

  publicPlayers() {
    return [...this.players.values()].map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar,
      score: p.score,
      roundScores: p.roundScores,
      isHost: p.isHost,
      hasGuessed: this.guesses.has(p.id),
      connected: p.connected,
    }));
  }

  currentImagePublic() {
    if (this.currentRound < 0 || this.currentRound >= this.images.length) return null;
    const img = this.images[this.currentRound];
    return { id: img.id, title: img.title, url: img.url, difficulty: img.difficulty, category: img.category };
  }

  startGame() {
    this.images = selectRandomImages(this.settings.difficulty, this.settings.numRounds);
    this.state = 'playing';
    this.currentRound = -1;
    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScores = [];
    }
  }

  startRound() {
    this.currentRound++;
    this.guesses.clear();
    this.roundStartTime = Date.now();
    this.state = 'playing';
  }

  submitGuess(playerId, guessYear, guessMonth) {
    if (this.guesses.has(playerId)) return false;
    this.guesses.set(playerId, { year: guessYear, month: guessMonth || null, submittedAt: Date.now() });
    return true;
  }

  allGuessed() {
    const connected = [...this.players.values()].filter(p => p.connected);
    return connected.every(p => this.guesses.has(p.id));
  }

  resolveRound() {
    const img = this.images[this.currentRound];
    const results = [];

    for (const [playerId, guess] of this.guesses.entries()) {
      const player = this.players.get(playerId);
      if (!player) continue;
      const score = calculateScore(guess.year, guess.month, img.year, img.month);
      const yearDiff = Math.abs(guess.year - img.year);
      player.score += score;
      player.roundScores.push(score);
      results.push({
        playerId,
        nickname: player.nickname,
        avatar: player.avatar,
        guessYear: guess.year,
        guessMonth: guess.month,
        score,
        totalScore: player.score,
        yearDiff,
      });
    }

    // Players who didn't guess
    for (const player of this.players.values()) {
      if (!this.guesses.has(player.id)) {
        player.roundScores.push(0);
        results.push({
          playerId: player.id,
          nickname: player.nickname,
          avatar: player.avatar,
          guessYear: null,
          guessMonth: null,
          score: 0,
          totalScore: player.score,
          yearDiff: null,
        });
      }
    }

    this.state = 'round_end';
    return {
      results,
      correctYear: img.year,
      correctMonth: img.month,
      imageTitle: img.title,
      hint: img.hint,
    };
  }

  isLastRound() {
    return this.currentRound >= this.images.length - 1;
  }

  getFinalRanking() {
    return [...this.players.values()]
      .map(p => ({ id: p.id, nickname: p.nickname, avatar: p.avatar, score: p.score, roundScores: p.roundScores }))
      .sort((a, b) => a.score - b.score); // worst to best for reveal
  }

  broadcast(event, data) {
    for (const p of this.players.values()) {
      if (p.connected) p.socket.emit(event, data);
    }
  }
}

function createRoom(hostId, hostData, settings) {
  let code;
  do { code = generateCode(); } while (rooms.has(code));
  const room = new DateGuessRoom(code, hostId, hostData, settings);
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get((code || '').toUpperCase().trim());
}

function deleteRoom(code) {
  const room = rooms.get(code);
  if (room?.timer) clearTimeout(room.timer);
  rooms.delete(code);
}

module.exports = { createRoom, getRoom, deleteRoom, DEFAULT_SETTINGS };
