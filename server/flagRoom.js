const { generateSequence } = require('./flagData');

const DEFAULT_SETTINGS = {
  mode: 'marathon',        // 'deathrun' | 'marathon' | 'speedrun'
  numOptions: 4,           // 2 | 4
  timerPerQuestion: 10,    // seconds per question (deathrun/marathon)
  numRounds: 20,           // marathon total rounds
  speedrunTime: 60,        // speedrun global duration (seconds)
  speedrunQuestionTime: 4, // seconds per question in speedrun
};

class FlagRoom {
  constructor(code, hostId) {
    this.code    = code;
    this.hostId  = hostId;
    this.players = new Map(); // id → {id,socket,name,avatar,score,alive}
    this.state   = 'lobby';
    this.settings = { ...DEFAULT_SETTINGS };

    this.questions     = [];
    this.questionIndex = 0;
    this.answers       = new Map(); // playerId → {code, correct}
    this.alive         = new Set();

    this.timer            = null;
    this.tickInterval     = null;
    this.questionInterval = null;
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
    for (const p of this.players.values()) { p.score = 0; p.alive = true; }
  }

  // ── Game start ────────────────────────────────────────────────────

  startGame() {
    const { mode, numOptions, numRounds } = this.settings;
    this.state = 'playing';
    this.questionIndex = 0;
    this.answers.clear();
    this.alive = new Set(this.players.keys());
    for (const p of this.players.values()) { p.score = 0; p.alive = true; }

    const count = mode === 'marathon' ? numRounds : 200;
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
    if (this.state !== 'question' && this.state !== 'speedrun') return;

    // Speedrun: handled separately
    if (this.state === 'speedrun') {
      if (this.answers.has(playerId)) return;
      const q = this.questions[this.questionIndex % this.questions.length];
      const correct = code === q.correctCode;
      this.answers.set(playerId, { code, correct });
      if (correct) {
        const p = this.players.get(playerId);
        if (p) p.score++;
      }
      this.broadcast('fg:player_answered', { playerId, scores: this._scoreMap() });
      return;
    }

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

    // Build answer map
    const answerMap = {};
    for (const [pid, ans] of this.answers) answerMap[pid] = ans;

    // Unanswered alive players count as wrong
    for (const pid of this.alive) {
      if (!this.answers.has(pid)) answerMap[pid] = { code: null, correct: false };
    }

    const eliminated = [];
    if (mode === 'deathrun') {
      for (const pid of this.alive) {
        if (!answerMap[pid]?.correct) {
          this.alive.delete(pid);
          const p = this.players.get(pid);
          if (p) p.alive = false;
          eliminated.push(pid);
        }
      }
    } else {
      // marathon: +1 for correct
      for (const [pid, ans] of Object.entries(answerMap)) {
        if (ans.correct) {
          const p = this.players.get(pid);
          if (p) p.score++;
        }
      }
    }

    const winner = (mode === 'deathrun' && this.alive.size === 1) ? [...this.alive][0] : null;
    const allOut = mode === 'deathrun' && this.alive.size === 0;

    this.broadcast('fg:round_end', {
      correctCode: q.correctCode,
      answers:     answerMap,
      eliminated,
      alive:       [...this.alive],
      players:     this.publicPlayers(),
      winner,
      allOut,
      round:       this.questionIndex + 1,
    });

    this.questionIndex++;

    const marathonDone = mode === 'marathon' && this.questionIndex >= this.settings.numRounds;
    if (winner || allOut || marathonDone) {
      setTimeout(() => this.endGame(), 4000);
    }
    // else: host manually calls nextQuestion()
  }

  nextQuestion() {
    if (this.state === 'result') this._startQuestion();
  }

  // ── Speedrun ──────────────────────────────────────────────────────

  _startSpeedrun() {
    const { speedrunTime, speedrunQuestionTime } = this.settings;
    this.speedrunRemaining = speedrunTime;
    this.state = 'speedrun';

    this.speedrunInterval = setInterval(() => {
      this.speedrunRemaining--;
      this.broadcast('fg:speedrun_tick', { remaining: this.speedrunRemaining });
      if (this.speedrunRemaining <= 0) {
        clearInterval(this.speedrunInterval);
        clearInterval(this.questionInterval);
        this.endGame();
      }
    }, 1000);

    this._sendSpeedrunQuestion();

    this.questionInterval = setInterval(() => {
      if (this.speedrunRemaining <= 0) return;
      // Flash correct answer briefly
      const q = this.questions[this.questionIndex % this.questions.length];
      this.broadcast('fg:speedrun_reveal', {
        correctCode: q.correctCode,
        answers: Object.fromEntries(this.answers),
        players: this.publicPlayers(),
      });
      this.answers.clear();
      this.questionIndex++;
      setTimeout(() => {
        if (this.speedrunRemaining > 0) this._sendSpeedrunQuestion();
      }, 600);
    }, speedrunQuestionTime * 1000);
  }

  _sendSpeedrunQuestion() {
    const q = this.questions[this.questionIndex % this.questions.length];
    this.answers.clear();
    this.broadcast('fg:question', {
      correctCode: q.correctCode,
      countryName: q.countryName,
      options:     q.options,
      round:       this.questionIndex + 1,
      totalRounds: null,
      timeLimit:   this.settings.speedrunQuestionTime,
      alivePlayers: null,
    });
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
    if (this.questionInterval) { clearInterval(this.questionInterval); this.questionInterval = null; }
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
