import test from 'node:test';
import assert from 'node:assert/strict';

import EventBus from '../js/utils/EventBus.js';
import GameState from '../js/core/GameState.js';
import RuleEngine from '../js/core/RuleEngine.js';

const createEngine = () => {
  const eventBus = new EventBus();
  const state = new GameState(eventBus);
  const engine = new RuleEngine(state, eventBus);
  return { state, engine };
};

test('RuleEngine detects five in a row horizontally', () => {
  const { state, engine } = createEngine();

  state.applyMove({ x: 3, y: 7, player: 1 });
  state.applyMove({ x: 4, y: 7, player: 1 });
  state.applyMove({ x: 5, y: 7, player: 1 });
  state.applyMove({ x: 6, y: 7, player: 1 });

  state.applyMove({ x: 7, y: 7, player: 1 });
  const result = engine.checkWin(7, 7, 1);
  assert.equal(result.isWin, true);
  assert.equal(result.winLine.length >= 5, true);
});

test('RuleEngine detects long line forbidden move', () => {
  const { state, engine } = createEngine();

  state.setPiece(2, 7, 1);
  state.setPiece(3, 7, 1);
  state.setPiece(4, 7, 1);
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);

  const forbidden = engine.detectForbidden(7, 7, 1);
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'long_line');
});

test('RuleEngine detects double three forbidden move', () => {
  const { state, engine } = createEngine();

  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(7, 6, 1);
  state.setPiece(7, 8, 1);

  const forbidden = engine.detectForbidden(7, 7, 1);
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_three');
});

test('White move is not forbidden by double three rule', () => {
  const { state, engine } = createEngine();

  state.setPiece(6, 7, 2);
  state.setPiece(8, 7, 2);
  state.setPiece(7, 6, 2);
  state.setPiece(7, 8, 2);

  const forbidden = engine.detectForbidden(7, 7, 2);
  assert.equal(forbidden.isForbidden, false);
});
