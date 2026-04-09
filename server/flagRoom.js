const { generateSequence } = require('./flagData');

const DEFAULT_SETTINGS = {
  mode: 'marathon',        // 'deathrun' | 'marathon' | 'speedrun'
  numOptions: 4,           // 2 | 4
  timerPerQuestion: 10,    // seconds per question (deathrun/marathon)
  numRounds: 20,           // marathon total rounds
  speedrunTime: 60,        // speedrun global duration (seconds)
};

class FlagRoom {
  constructor(code, hostId) {
    this.code    = code;
    this.hostId  = hostId;
    this.players = new Map(); // id → {id,socket,name,avatar,score,alive}
    this.state   = 'lobby';
    this.settings = { ...DEFAULT_SETTINGS };

    this.questions        = [];
    this.questionIndex    = 0;
    this.answers          = new Map(); // playerId → {code, correct}
    this.alive            = new Set();
    this.initialAliveCount = 0;
    this.playerQIndex     = new Map(); // speedrun: per-player question index

    this.timer            = null;
    this.tickInterval     = null;
    this.speedrunInterval = null;
    this.speedrunRemaining = 0;
  }

  // ── Players ──────────────────────────────────────────────────────

  addPlayer(id, socket, name, avatar) {
    this.players.set(id, { id, socket, name, avatar, score: 0, alive: true });
  }

  removePlayer(id) {
    this.players.delete(id);
    this.alive.delete(id);
    if (this.hostId === id) {
      const next = this.players.keys().next().value;
      if (next) this.hostId = next;
    }
  }

  publicPlayers() {
    return [...this.players.values()].map(p => ({
      id: p.id, name: p.name, avatar: p.avatar,
      score: p.score, alive: p.alive, isHost: p.id === this.hostId,
    }));
  }

  broadcast(event, data) {
    for (const p of this.players.values()) p.socket.emit(event, data);
  }

  reset() {
    this._clearTimers();
    this.state = 'lobby';
    this.questions = [];
    this.questionIndex = 0;
    this.answers.clear();
    this.alive.clear();
    this.playerQIndex.clear();
    this.initialAliveCount = 0;
    for (const p of this.players.values()) { p.score = 0; p.alive = true; }
  }

  // ── Game start ────────────────────────────────────────────────────

  startGame() {
    const { mode, numOptions, numRounds } = this.settings;
    this.state = 'playing';
    this.questionIndex = 0;
    this.answers.clear();
    this.playerQIndex.clear();
    this.alive = new Set(this.players.keys());
    this.initialAliveCount = this.players.size;
    for (const p of this.players.values()) { p.score = 0; p.alive = true; }

    // Generate enough questions
    const count = mode === 'marathon' ? numRounds : 500;
    this.questions = generateSequence(count, numOptions);

    this.broadcast('fg:game_started', { mode, settings: this.settings });

    if (mode === 'speedrun') {
      this._startSpeedrun();
    } else {
      this._startQuestion();
    }
  }

  // ── Deathrun / Marathon ───────────────────────────────────────────

  _startQuestion() {
    if (this.questionIndex >= this.questions.length) { this.endGame(); return; }

    this._clearTimers();
    this.answers.clear();
    this.state = 'question';

    const q = this.questions[this.questionIndex];
    const timeLimit = this.settings.timerPerQuestion;

    this.broadcast('fg:question', {
      correctCode: q.correctCode,
      countryName: q.countryName,
      options:     q.options,
      round:       this.questionIndex + 1,
      totalRounds: this.settings.mode === 'marathon' ? this.settings.numRounds : null,
      timeLimit,
      alivePlayers: [...this.alive],
    });

    let remaining = timeLimit;
    this.tickInterval = setInterval(() => {
      remaining--;
      this.broadcast('fg:tick', { remaining });
      if (remaining <= 0) clearInterval(this.tickInterval);
    }, 1000);

    this.timer = setTimeout(() => this._resolveQuestion(), timeLimit * 1000);
  }

  submitAnswer(playerId, code) {
    // ── Speedrun: per-player independent questions ──
    if (this.state === 'speedrun') {
      const qIdx = this.playerQIndex.get(playerId) ?? 0;
      const q = this.questions[qIdx % this.questions.length];
      const correct = code === q.correctCode;
      const p = this.players.get(playerId);
      if (p && correct) p.score++;

      const nextIdx = qIdx + 1;
      this.playerQIndex.set(playerId, nextIdx);

      // Broadcast updated scores to all
      this.broadcast('fg:scores', { scores: this._scoreMap() });

      // Send next question immediately to this player
      if (p && this.speedrunRemaining > 0) {
        p.socket.emit('fg:speedrun_next', {
          reveal:   { correctCode: q.correctCode, wasCorrect: correct },
          question: this._getSpeedrunQ(nextIdx),
          score:    p.score,
        });
      }
      return;
    }

    // ── Deathrun / Marathon ──
    if (this.state !== 'question') return;
    if (!this.alive.has(playerId)) return;
    if (this.answers.has(playerId)) return;

    const q = this.questions[this.questionIndex];
    const correct = code === q.correctCode;
    this.answers.set(playerId, { code, correct });

    this.broadcast('fg:player_answered', { playerId });

    // All alive players answered?
    const pending = [...this.alive].filter(id => !this.answers.has(id));
    if (pending.length === 0) {
      this._clearTimers();
      this._resolveQuestion();
    }
  }

  _resolveQuestion() {
    this._clearTimers();
    this.state = 'result';

    const q   = this.questions[this.questionIndex];
    const mode = this.settings.mode;

    // Build answer map — unanswered alive players = wrong
    const answerMap = {};
    for (const [pid, ans] of this.answers) answerMap[pid] = ans;
    for (const pid of this.alive) {
      if (!this.answers.has(pid)) answerMap[pid] = { code: null, correct: false };
    }

    const eliminated = [];

    if (mode === 'deathrun') {
      // Score correct answers, then eliminate wrong ones
      const toEliminate = [];
      for (const pid of this.alive) {
        if (answerMap[pid]?.correct) {
          const p = this.players.get(pid);
          if (p) p.score++;
        } else {
          toEliminate.push(pid);
        }
      }
      for (const pid of toEliminate) {
        this.alive.delete(pid);
        const p = this.players.get(pid);
        if (p) p.alive = false;
        eliminated.push(pid);
      }
    } else {
      // Marathon: +1 for correct
      for (const [pid, ans] of Object.entries(answerMap)) {
        if (ans.correct) {
          const p = this.players.get(pid);
          if (p) p.score++;
        }
      }
    }

    // Deathrun ends ONLY when everyone is eliminated
    const allOut = mode === 'deathrun' && this.alive.size === 0;

    this.broadcast('fg:round_end', {
      correctCode: q.correctCode,
      answers:     answerMap,
      eliminated,
      alive:       [...this.alive],
      players:     this.publicPlayers(),
      allOut,
      round:       this.questionIndex + 1,
    });

    this.questionIndex++;

    const marathonDone = mode === 'marathon' && this.questionIndex >= this.settings.numRounds;
    if (allOut || marathonDone) {
      this.endGame();
    }
    // else: host manually calls nextQuestion()
  }

  nextQuestion() {
    if (this.state === 'result') this._startQuestion();
  }

  // ── Speedrun ──────────────────────────────────────────────────────

  _startSpeedrun() {
    const { speedrunTime } = this.settings;
    this.speedrunRemaining = speedrunTime;
    this.state = 'speedrun';

    // Global countdown
    this.speedrunInterval = setInterval(() => {
      this.speedrunRemaining--;
      this.broadcast('fg:speedrun_tick', { remaining: this.speedrunRemaining });
      if (this.speedrunRemaining <= 0) {
        clearInterval(this.speedrunInterval);
        this.endGame();
      }
    }, 1000);

    // Send first question to each player independently
    for (const p of this.players.values()) {
      this.playerQIndex.set(p.id, 0);
      p.socket.emit('fg:speedrun_next', {
        reveal:   null,  // no previous answer
        question: this._getSpeedrunQ(0),
        score:    0,
      });
    }
  }

  _getSpeedrunQ(qIndex) {
    const q = this.questions[qIndex % this.questions.length];
    return {
      correctCode: q.correctCode,
      countryName: q.countryName,
      options:     q.options,
      qIndex:      qIndex + 1,
    };
  }

  _scoreMap() {
    const m = {};
    for (const p of this.players.values()) m[p.id] = p.score;
    return m;
  }

  // ── End ────────────────────────────────────────────────────────────

  endGame() {
    this._clearTimers();
    this.state = 'finished';
    const ranking = this.publicPlayers().sort((a, b) => b.score - a.score);
    this.broadcast('fg:game_end', { ranking, mode: this.settings.mode });
  }

  _clearTimers() {
    if (this.timer)            { clearTimeout(this.timer);             this.timer = null; }
    if (this.tickInterval)     { clearInterval(this.tickInterval);     this.tickInterval = null; }
    if (this.speedrunInterval) { clearInterval(this.speedrunInterval); this.speedrunInterval = null; }
  }
}

// ── Room registry ────────────────────────────────────────────────────

const rooms = new Map();

function createRoom(hostId) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const room = new FlagRoom(code, hostId);
  rooms.set(code, room);
  return room;
}

function getRoom(code)   { return rooms.get(code); }
function deleteRoom(code){ rooms.delete(code); }

module.exports = { FlagRoom, createRoom, getRoom, deleteRoom };
