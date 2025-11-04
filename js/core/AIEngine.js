/**
 * AI引擎 - 负责调度不同难度的AI策略
 */
import MathUtils from '../utils/MathUtils.js';

/**
 * AI策略基类
 */
class AIStrategy {
  constructor(config) {
    this.name = config.name;
    this.maxDepth = config.maxDepth || 2;
    this.timeout = config.timeout || 2000;
    this.maxCandidates = config.maxCandidates || 15;
  }

  /**
   * 计算最佳落子点
   * @param {Object} state - GameState实例
   * @param {number} player
   * @returns {Promise<{x:number, y:number, score?:number}>}
   */
  async compute(state, player) {
    throw new Error('AIStrategy.compute() must be implemented by subclass');
  }

  /**
   * 评估局面
   * @param {number[][]} board
   * @param {number} player
   * @returns {number}
   */
  evaluate(board, player) {
    const myScore = MathUtils.evaluateBoard(board, player);
    const opponentScore = MathUtils.evaluateBoard(board, MathUtils.getOpponent(player));
    return myScore - opponentScore * 0.9;
  }
}

/**
 * 新手策略 - 基于随机和简单防守
 */
class BeginnerStrategy extends AIStrategy {
  constructor() {
    super({ name: 'BEGINNER', maxDepth: 1, timeout: 600, maxCandidates: 20 });
  }

  async compute(state, player) {
    const candidates = MathUtils.generateCandidateMoves(state.board, 2);
    if (candidates.length === 0) {
      const mid = Math.floor(state.boardSize / 2);
      return { x: mid, y: mid, score: 0 };
    }

    const topCandidates = candidates.slice(0, Math.min(15, candidates.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    const move = topCandidates[randomIndex];
    return { x: move.x, y: move.y, score: move.weight };
  }
}

/**
 * 普通策略 - Minimax + Alpha-Beta剪枝
 */
class NormalStrategy extends AIStrategy {
  constructor() {
    super({ name: 'NORMAL', maxDepth: 2, timeout: 1000, maxCandidates: 12 });
  }

  async compute(state, player) {
    const candidates = MathUtils.generateCandidateMoves(state.board, 2);
    if (candidates.length === 0) {
      const mid = Math.floor(state.boardSize / 2);
      return { x: mid, y: mid, score: 0 };
    }

    let bestMove = null;
    let bestScore = -Infinity;

    const topCandidates = candidates.slice(0, Math.min(this.maxCandidates, candidates.length));

    for (const candidate of topCandidates) {
      const { x, y } = candidate;
      const board = MathUtils.cloneBoard(state.board);
      board[y][x] = player;

      const score = this._minimax(board, player, 1, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { x, y, score };
      }
    }

    return bestMove || topCandidates[0];
  }

  _minimax(board, player, depth, alpha, beta, isMaximizing) {
    if (depth >= this.maxDepth) {
      return this.evaluate(board, player);
    }

    const candidates = MathUtils.generateCandidateMoves(board, 2).slice(0, this.maxCandidates);
    if (candidates.length === 0) {
      return this.evaluate(board, player);
    }

    const currentPlayer = isMaximizing ? player : MathUtils.getOpponent(player);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const candidate of candidates) {
        const { x, y } = candidate;
        board[y][x] = currentPlayer;
        const evalScore = this._minimax(board, player, depth + 1, alpha, beta, false);
        board[y][x] = 0;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const candidate of candidates) {
        const { x, y } = candidate;
        board[y][x] = currentPlayer;
        const evalScore = this._minimax(board, player, depth + 1, alpha, beta, true);
        board[y][x] = 0;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}

/**
 * 困难策略 - 更深的搜索
 */
class HardStrategy extends AIStrategy {
  constructor() {
    super({ name: 'HARD', maxDepth: 3, timeout: 2000, maxCandidates: 10 });
  }

  async compute(state, player) {
    const candidates = MathUtils.generateCandidateMoves(state.board, 2);
    if (candidates.length === 0) {
      const mid = Math.floor(state.boardSize / 2);
      return { x: mid, y: mid, score: 0 };
    }

    let bestMove = null;
    let bestScore = -Infinity;

    const topCandidates = candidates.slice(0, Math.min(this.maxCandidates, candidates.length));

    for (const candidate of topCandidates) {
      const { x, y } = candidate;
      const board = MathUtils.cloneBoard(state.board);
      board[y][x] = player;

      const score = this._minimax(board, player, 1, -Infinity, Infinity, false);
      if (score > bestScore) {
        bestScore = score;
        bestMove = { x, y, score };
      }
    }

    return bestMove || topCandidates[0];
  }

  _minimax(board, player, depth, alpha, beta, isMaximizing) {
    if (depth >= this.maxDepth) {
      return this.evaluate(board, player);
    }

    const candidates = MathUtils.generateCandidateMoves(board, 2).slice(0, this.maxCandidates);
    if (candidates.length === 0) {
      return this.evaluate(board, player);
    }

    const currentPlayer = isMaximizing ? player : MathUtils.getOpponent(player);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const candidate of candidates) {
        const { x, y } = candidate;
        board[y][x] = currentPlayer;
        const evalScore = this._minimax(board, player, depth + 1, alpha, beta, false);
        board[y][x] = 0;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const candidate of candidates) {
        const { x, y } = candidate;
        board[y][x] = currentPlayer;
        const evalScore = this._minimax(board, player, depth + 1, alpha, beta, true);
        board[y][x] = 0;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}

/**
 * 地狱策略 - 最深搜索和威胁检测
 */
class HellStrategy extends AIStrategy {
  constructor() {
    super({ name: 'HELL', maxDepth: 4, timeout: 2400, maxCandidates: 8 });
  }

  async compute(state, player) {
    const candidates = MathUtils.generateCandidateMoves(state.board, 2);
    if (candidates.length === 0) {
      const mid = Math.floor(state.boardSize / 2);
      return { x: mid, y: mid, score: 0 };
    }

    let bestMove = null;
    let bestScore = -Infinity;

    const topCandidates = candidates.slice(0, Math.min(this.maxCandidates, candidates.length));

    for (const candidate of topCandidates) {
      const { x, y } = candidate;
      const board = MathUtils.cloneBoard(state.board);
      board[y][x] = player;

      let score = this._minimax(board, player, 1, -Infinity, Infinity, false);
      score += this._threatBonus(board, x, y, player);

      if (score > bestScore) {
        bestScore = score;
        bestMove = { x, y, score };
      }
    }

    return bestMove || topCandidates[0];
  }

  _minimax(board, player, depth, alpha, beta, isMaximizing) {
    if (depth >= this.maxDepth) {
      return this.evaluate(board, player);
    }

    const candidates = MathUtils.generateCandidateMoves(board, 2).slice(0, this.maxCandidates);
    if (candidates.length === 0) {
      return this.evaluate(board, player);
    }

    const currentPlayer = isMaximizing ? player : MathUtils.getOpponent(player);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const candidate of candidates) {
        const { x, y } = candidate;
        board[y][x] = currentPlayer;
        const evalScore = this._minimax(board, player, depth + 1, alpha, beta, false);
        board[y][x] = 0;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const candidate of candidates) {
        const { x, y } = candidate;
        board[y][x] = currentPlayer;
        const evalScore = this._minimax(board, player, depth + 1, alpha, beta, true);
        board[y][x] = 0;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  _threatBonus(board, x, y, player) {
    let bonus = 0;
    for (const dir of MathUtils.BOARD_DIRECTIONS) {
      const { count, openEnds } = MathUtils.countDirection(board, x, y, dir.dx, dir.dy, player);
      if (count === 4 && openEnds === 2) {
        bonus += 50000;
      } else if (count === 4 && openEnds === 1) {
        bonus += 20000;
      } else if (count === 3 && openEnds === 2) {
        bonus += 5000;
      }
    }
    return bonus;
  }
}

/**
 * AI引擎主类
 */
class AIEngine {
  constructor(gameState, ruleEngine, eventBus) {
    this.state = gameState;
    this.rules = ruleEngine;
    this.eventBus = eventBus;

    this.strategies = new Map([
      ['BEGINNER', new BeginnerStrategy()],
      ['NORMAL', new NormalStrategy()],
      ['HARD', new HardStrategy()],
      ['HELL', new HellStrategy()]
    ]);

    this.currentDifficulty = {
      black: 'NORMAL',
      white: 'NORMAL'
    };
  }

  /**
   * 设置AI难度
   * @param {number} player - 1=黑, 2=白
   * @param {string} level - BEGINNER | NORMAL | HARD | HELL
   */
  setDifficulty(player, level) {
    const key = player === 1 ? 'black' : 'white';
    if (!this.strategies.has(level)) {
      throw new Error(`Unknown difficulty level: ${level}`);
    }
    this.currentDifficulty[key] = level;
    if (this.eventBus) {
      this.eventBus.emit('ai:difficultyChanged', { player, level });
    }
  }

  /**
   * 计算最佳落子点
   * @param {number} player
   * @returns {Promise<{x:number, y:number, score?:number, thinkingTime?:number}>}
   */
  async computeMove(player) {
    const key = player === 1 ? 'black' : 'white';
    const level = this.currentDifficulty[key];
    const strategy = this.strategies.get(level);

    if (this.eventBus) {
      this.eventBus.emit('ai:thinking', { player, level });
    }

    const startTime = Date.now();
    let move = await strategy.compute(this.state, player);
    const thinkingTime = Date.now() - startTime;

    const validation = this.rules.validateMove(move.x, move.y, player);
    if (!validation.valid) {
      const fallback = this._findFallbackMove(player, move.x, move.y);
      if (fallback) {
        move = fallback;
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('ai:computed', { player, move, thinkingTime, level });
    }

    return { ...move, thinkingTime };
  }

  /**
   * 获取AI提示（建议落子点）
   * @param {number} player
   * @returns {Promise<{x:number, y:number}>}
   */
  async getHint(player) {
    const strategy = this.strategies.get('NORMAL');
    return strategy.compute(this.state, player);
  }

  /**
   * 兜底寻找合法落子点
   * @param {number} player
   * @param {number} excludedX
   * @param {number} excludedY
   * @returns {{x:number, y:number, score?:number}|null}
   */
  _findFallbackMove(player, excludedX, excludedY) {
    const candidates = MathUtils.generateCandidateMoves(this.state.board, 2);
    for (const candidate of candidates) {
      if (candidate.x === excludedX && candidate.y === excludedY) continue;
      const validation = this.rules.validateMove(candidate.x, candidate.y, player);
      if (validation.valid) {
        return { x: candidate.x, y: candidate.y, score: candidate.weight };
      }
    }
    return null;
  }
}

AIEngine.__moduleInfo = {
  name: 'AIEngine',
  version: '2.0.0',
  dependencies: ['GameState', 'RuleEngine', 'MathUtils']
};

if (typeof window !== 'undefined') {
  window.AIEngine = AIEngine;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: AIEngine.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIEngine;
}

export default AIEngine;
