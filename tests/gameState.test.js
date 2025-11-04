import test from 'node:test';
import assert from 'node:assert/strict';

import EventBus from '../js/utils/EventBus.js';
import GameState from '../js/core/GameState.js';

const createState = () => new GameState(new EventBus());

test('GameState apply move updates board and history', () => {
  const state = createState();
  assert.equal(state.moveHistory.length, 0);

  const result = state.applyMove({ x: 7, y: 7, player: 1 });
  assert.equal(result.success, true);
  assert.equal(state.board[7][7], 1);
  assert.equal(state.moveHistory.length, 1);
  assert.equal(state.gameStatus, 'playing');

  state.switchPlayer();
  state.applyMove({ x: 7, y: 8, player: 2 });
  assert.equal(state.board[8][7], 2);
  assert.equal(state.moveHistory.length, 2);
});

test('GameState undo removes last move', () => {
  const state = createState();
  state.applyMove({ x: 1, y: 1, player: 1 });
  state.applyMove({ x: 2, y: 2, player: 2 });
  assert.equal(state.moveHistory.length, 2);

  const undoResult = state.undoMove();
  assert.equal(undoResult.success, true);
  assert.equal(state.board[2][2], 0);
  assert.equal(state.moveHistory.length, 1);

  const undoResult2 = state.undoMove();
  assert.equal(undoResult2.success, true);
  assert.equal(state.board[1][1], 0);
  assert.equal(state.moveHistory.length, 0);
  assert.equal(state.gameStatus, 'ready');
});
