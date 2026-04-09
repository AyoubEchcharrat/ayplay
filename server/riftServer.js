'use strict';
const { createRoom, getRoom, deleteRoom } = require('./riftRoom');

function initRiftGame(io) {
  const rb = io.of('/rb');

  rb.on('connection', (socket) => {
    const room = () => socket.data.rbRoom ? getRoom(socket.data.rbRoom) : null;
    const player = () => { const r = room(); return r?.players.get(socket.id); };

    // ── Lobby ──────────────────────────────────────────────────
    socket.on('rb:create', ({ name, avatar }) => {
      const r = createRoom(socket.id);
      r.addPlayer(socket.id, socket, name, avatar);
      socket.data.rbRoom = r.code;
      socket.emit('rb:created', { roomCode: r.code, state: r.publicState() });
    });

    socket.on('rb:join', ({ code, name, avatar }) => {
      const r = getRoom((code || '').toUpperCase());
      if (!r) return socket.emit('rb:error', { message: 'Room introuvable' });
      if (r.players.size >= 2) return socket.emit('rb:error', { message: 'Room pleine (max 2 joueurs)' });
      if (r.phase !== 'lobby') return socket.emit('rb:error', { message: 'Partie déjà commencée' });
      r.addPlayer(socket.id, socket, name, avatar);
      socket.data.rbRoom = r.code;
      socket.emit('rb:joined', { roomCode: r.code, state: r.publicState() });
      r.broadcast('rb:state', r.publicState());
    });

    // ── Draft ──────────────────────────────────────────────────
    socket.on('rb:draft', ({ championIds }) => {
      const r = room();
      if (!r) return;
      if (r.phase !== 'draft') return socket.emit('rb:error', { message: 'Pas en phase de draft' });
      if (!Array.isArray(championIds) || championIds.length !== 5)
        return socket.emit('rb:error', { message: 'Choisir exactement 5 champions' });
      const draftResult = r.chooseDraft(socket.id, championIds);
      if (draftResult?.error) return socket.emit('rb:error', { message: draftResult.error });
      r.broadcast('rb:state', r.publicState());
    });

    // ── Placement ─────────────────────────────────────────────
    socket.on('rb:place', ({ championId, row, col }) => {
      const r = room();
      if (!r) return;
      if (r.phase !== 'placement') return socket.emit('rb:error', { message: 'Pas en phase de placement' });
      const placeResult = r.placeChampion(socket.id, championId, row, col);
      if (placeResult?.error) return socket.emit('rb:error', { message: placeResult.error });
      r.broadcast('rb:state', r.publicState());
    });

    // ── Actions ────────────────────────────────────────────────
    socket.on('rb:move', ({ pieceId, row, col }) => {
      const r = room();
      if (!r) return;
      const moveResult = r.actionMove(socket.id, pieceId, row, col);
      if (moveResult?.error) return socket.emit('rb:error', { message: moveResult.error });
      r.broadcast('rb:state', r.publicState());
    });

    socket.on('rb:attack', ({ pieceId, targetRow, targetCol }) => {
      const r = room();
      if (!r) return;
      const attackResult = r.actionAttack(socket.id, pieceId, targetRow, targetCol);
      if (attackResult?.error) return socket.emit('rb:error', { message: attackResult.error });
      r.broadcast('rb:state', r.publicState());
    });

    socket.on('rb:spell', ({ pieceId, spellKey, targetRow, targetCol, extra }) => {
      const r = room();
      if (!r) return;
      const spellResult = r.actionSpell(socket.id, pieceId, spellKey, targetRow, targetCol, extra);
      if (spellResult?.error) return socket.emit('rb:error', { message: spellResult.error });
      r.broadcast('rb:state', r.publicState());
    });

    socket.on('rb:end_turn', ({ pieceId }) => {
      const r = room();
      if (!r) return;
      const endResult = r.actionEndTurn(socket.id, pieceId);
      if (endResult?.error) return socket.emit('rb:error', { message: endResult.error });
      r.broadcast('rb:state', r.publicState());
    });

    // ── Start draft (host triggers when both players in lobby) ─
    socket.on('rb:start_draft', () => {
      const r = room();
      if (!r || r.hostId !== socket.id) return;
      if (r.players.size < 2) return socket.emit('rb:error', { message: 'En attente d\'un 2ème joueur' });
      if (r.phase !== 'lobby') return;
      r.phase = 'draft';
      r.broadcast('rb:state', r.publicState());
    });

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      const r = room();
      if (!r) return;
      r.players.delete(socket.id);
      if (r.players.size === 0) {
        deleteRoom(r.code);
        return;
      }
      // Notify remaining player
      r.broadcast('rb:player_left', { message: 'L\'adversaire a quitté la partie.' });
      if (r.phase === 'playing') {
        const remaining = [...r.players.values()];
        r.endGame(remaining[0].team);
        r.broadcast('rb:state', r.publicState());
      }
    });
  });
}

module.exports = { initRiftGame };
