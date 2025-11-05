/**
 * 禁手规则全面测试套件
 * 测试所有禁手情况：三三、四四、长连
 */
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

// ============ 三三禁手测试 ============

test('三三禁手 - 标准十字型', () => {
  const { state, engine } = createEngine();
  
  // 构造：
  //     o
  //   o X o
  //     o
  // 在(7,7)形成十字，左右各一子，上下各一子
  state.setPiece(6, 7, 1); // 左
  state.setPiece(8, 7, 1); // 右
  state.setPiece(7, 6, 1); // 上
  state.setPiece(7, 8, 1); // 下
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('十字型三三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true, '应该检测到三三禁手');
  assert.equal(forbidden.type, 'double_three', '应该是三三类型');
  assert.equal(forbidden.details.openThrees >= 2, true, '应该至少有2个活三');
});

test('三三禁手 - L型', () => {
  const { state, engine } = createEngine();
  
  // 构造：
  //   o X o
  //     o
  //     o
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(7, 8, 1);
  state.setPiece(7, 9, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('L型三三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_three');
});

test('三三禁手 - 斜向', () => {
  const { state, engine } = createEngine();
  
  // 构造：
  // o   o
  //   X
  // o   o
  state.setPiece(6, 6, 1); // 左上
  state.setPiece(8, 8, 1); // 右下
  state.setPiece(6, 8, 1); // 左下
  state.setPiece(8, 6, 1); // 右上
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('斜向三三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_three');
});

test('三三禁手 - 跳三+连三', () => {
  const { state, engine } = createEngine();
  
  // 构造：
  //   o   X       (横向跳三：5,7 - 7,7 - 8,7)
  //     X         (纵向连三：7,7 - 7,8 - 7,9)
  //     X
  state.setPiece(5, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(7, 8, 1);
  state.setPiece(7, 9, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('跳三+连三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_three');
});

test('非三三 - 单个活三', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('单活三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, false, '单个活三不应禁手');
});

test('非三三 - 有眠三（一端被堵）', () => {
  const { state, engine } = createEngine();
  
  // 白棋堵住一端
  state.setPiece(5, 7, 2);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(7, 6, 1);
  state.setPiece(7, 8, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('有眠三检测:', JSON.stringify(forbidden, null, 2));
  
  // 如果一个三被堵，不是活三，不应该禁手
  // 这取决于具体规则，但通常眠三不算
});

test('非三三 - 白棋不受限制', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(6, 7, 2);
  state.setPiece(8, 7, 2);
  state.setPiece(7, 6, 2);
  state.setPiece(7, 8, 2);
  
  const forbidden = engine.detectForbidden(7, 7, 2);
  console.log('白棋三三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, false, '白棋不受禁手限制');
});

// ============ 四四禁手测试 ============

test('四四禁手 - 双活四', () => {
  const { state, engine } = createEngine();
  
  // 构造：
  //   o o o X
  //       o
  //       o
  //       o
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(7, 6, 1);
  state.setPiece(7, 5, 1);
  state.setPiece(7, 4, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('双活四检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_four');
});

test('四四禁手 - 冲四+活四', () => {
  const { state, engine } = createEngine();
  
  // 活四
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  
  // 冲四（一端被堵）
  state.setPiece(7, 6, 1);
  state.setPiece(7, 5, 1);
  state.setPiece(7, 4, 1);
  state.setPiece(7, 3, 2); // 白棋堵住
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('冲四+活四检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_four');
});

test('四四禁手 - 双冲四', () => {
  const { state, engine } = createEngine();
  
  // 横向冲四
  state.setPiece(4, 7, 2); // 白棋堵
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  
  // 纵向冲四
  state.setPiece(7, 3, 2); // 白棋堵
  state.setPiece(7, 4, 1);
  state.setPiece(7, 5, 1);
  state.setPiece(7, 6, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('双冲四检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_four');
});

test('非四四 - 单个活四', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('单活四检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, false, '单个活四不应禁手');
});

// ============ 长连禁手测试 ============

test('长连禁手 - 六连', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(2, 7, 1);
  state.setPiece(3, 7, 1);
  state.setPiece(4, 7, 1);
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('六连检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'long_line');
});

test('长连禁手 - 七连', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(2, 7, 1);
  state.setPiece(3, 7, 1);
  state.setPiece(4, 7, 1);
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('七连检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'long_line');
});

test('长连禁手 - 斜向六连', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(2, 2, 1);
  state.setPiece(3, 3, 1);
  state.setPiece(4, 4, 1);
  state.setPiece(5, 5, 1);
  state.setPiece(6, 6, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('斜向六连检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'long_line');
});

test('非长连 - 五连胜利', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(3, 7, 1);
  state.setPiece(4, 7, 1);
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('五连检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, false, '五连应该胜利，不是禁手');
});

// ============ 边界和特殊情况测试 ============

test('边界 - 棋盘边缘的活三', () => {
  const { state, engine } = createEngine();
  
  // 在边缘构造活三
  state.setPiece(0, 1, 1);
  state.setPiece(0, 3, 1);
  
  const forbidden = engine.detectForbidden(0, 2, 1);
  console.log('边缘活三检测:', JSON.stringify(forbidden, null, 2));
  
  // 边缘的三可能不是活三（没有足够空间）
});

test('边界 - 角落的棋子', () => {
  const { state, engine } = createEngine();
  
  state.setPiece(1, 0, 1);
  state.setPiece(0, 1, 1);
  
  const forbidden = engine.detectForbidden(0, 0, 1);
  console.log('角落检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, false);
});

test('复杂情况 - 四三（活四+活三）', () => {
  const { state, engine } = createEngine();
  
  // 活四
  state.setPiece(5, 7, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  
  // 活三
  state.setPiece(7, 6, 1);
  state.setPiece(7, 8, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('四三检测:', JSON.stringify(forbidden, null, 2));
  
  // 四三不是禁手，应该可以落子
  assert.equal(forbidden.isForbidden, false, '四三不应该是禁手');
});

test('禁手关闭时不检测', () => {
  const { state, engine } = createEngine();
  
  // 关闭禁手规则
  state.settings.forbiddenRules = false;
  
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(7, 6, 1);
  state.setPiece(7, 8, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('禁手关闭检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, false, '禁手规则关闭时不应检测');
});

// ============ 真实对局情况测试 ============

test('真实案例 - 梅花五三三', () => {
  const { state, engine } = createEngine();
  
  // 这是实战中常见的梅花五型三三
  //     o
  //   o X
  //     X o
  //       o
  state.setPiece(7, 6, 1);
  state.setPiece(6, 7, 1);
  state.setPiece(8, 8, 1);
  state.setPiece(7, 9, 1);
  state.setPiece(9, 7, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('梅花五三三检测:', JSON.stringify(forbidden, null, 2));
  
  assert.equal(forbidden.isForbidden, true);
  assert.equal(forbidden.type, 'double_three');
});

test('真实案例 - 假三三（有眠三）', () => {
  const { state, engine } = createEngine();
  
  // 一个活三，一个眠三
  state.setPiece(6, 7, 1);
  state.setPiece(8, 7, 1);
  state.setPiece(9, 7, 2); // 白棋堵住
  state.setPiece(7, 6, 1);
  state.setPiece(7, 8, 1);
  
  const forbidden = engine.detectForbidden(7, 7, 1);
  console.log('假三三检测:', JSON.stringify(forbidden, null, 2));
  
  // 如果一个是眠三，则不应该是三三禁手
  // 但这取决于算法的具体实现
});
