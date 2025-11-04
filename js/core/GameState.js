/**
 * 游戏状态管理 - 数据层核心
 * 负责维护游戏的完整状态，包括棋盘数据、移动历史、当前玩家等
 */
class GameState {
  constructor(eventBus, boardSize = 15) {
    this.eventBus = eventBus;
    this.boardSize = boardSize;
    this.reset();
  }

  /**
   * 重置游戏状态
   */
  reset() {
    this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
    this.currentPlayer = 1; // 1=黑棋, 2=白棋
    this.moveHistory = [];
    this.mode = 'PvP'; // PvP | PvE | EvE
    this.settings = {
      forbiddenRules: true,
      aiDifficulty: 'NORMAL',
      blackAI: 'NORMAL',
      whiteAI: 'NORMAL',
      firstPlayer: 1,
      playerSide: 1
    };
    this.gameStatus = 'ready'; // ready | playing | finished
    this.winner = null;
    this.winLine = null;
    this.startTime = null;
    this.endTime = null;

    if (this.eventBus) {
      this.eventBus.emit('state:reset', this.getSnapshot());
    }
  }

  /**
   * 检查坐标是否有效
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isValidPosition(x, y) {
    return x >= 0 && y >= 0 && x < this.boardSize && y < this.boardSize;
  }

  /**
   * 获取指定位置的棋子
   * @param {number} x
   * @param {number} y
   * @returns {number} 0=空, 1=黑, 2=白
   */
  getPiece(x, y) {
    if (!this.isValidPosition(x, y)) {
      throw new Error(`Invalid position: (${x}, ${y})`);
    }
    return this.board[y][x];
  }

  /**
   * 设置指定位置的棋子
   * @param {number} x
   * @param {number} y
   * @param {number} player
   */
  setPiece(x, y, player) {
    if (!this.isValidPosition(x, y)) {
      throw new Error(`Invalid position: (${x}, ${y})`);
    }
    this.board[y][x] = player;
  }

  /**
   * 落子并更新状态
   * @param {Object} move
   * @param {number} move.x
   * @param {number} move.y
   * @param {number} [move.player] - 如未指定，使用当前玩家
   * @returns {{success: boolean, error?: string}}
   */
  applyMove(move) {
    const { x, y } = move;
    const player = move.player || this.currentPlayer;

    if (!this.isValidPosition(x, y)) {
      return { success: false, error: 'Position out of bounds' };
    }

    if (this.board[y][x] !== 0) {
      return { success: false, error: 'Position occupied' };
    }

    if (this.gameStatus === 'finished') {
      return { success: false, error: 'Game already finished' };
    }

    this.board[y][x] = player;
    const moveRecord = {
      step: this.moveHistory.length + 1,
      x,
      y,
      player,
      timestamp: Date.now()
    };
    this.moveHistory.push(moveRecord);

    if (this.gameStatus === 'ready') {
      this.gameStatus = 'playing';
      this.startTime = Date.now();
    }

    if (this.eventBus) {
      this.eventBus.emit('move:applied', moveRecord);
      this.eventBus.emit('state:changed', this.getSnapshot());
    }

    return { success: true };
  }

  /**
   * 撤回最后一步
   * @returns {{success: boolean, move?: Object}}
   */
  undoMove() {
    if (this.moveHistory.length === 0) {
      return { success: false, error: 'No moves to undo' };
    }

    const lastMove = this.moveHistory.pop();
    this.board[lastMove.y][lastMove.x] = 0;

    if (this.moveHistory.length === 0) {
      this.gameStatus = 'ready';
      this.startTime = null;
    }

    if (this.eventBus) {
      this.eventBus.emit('move:undone', lastMove);
      this.eventBus.emit('state:changed', this.getSnapshot());
    }

    return { success: true, move: lastMove };
  }

  /**
   * 切换当前玩家
   */
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    if (this.eventBus) {
      this.eventBus.emit('player:switched', { currentPlayer: this.currentPlayer });
    }
  }

  /**
   * 标记游戏结束
   * @param {Object} result
   * @param {number|null} result.winner - 获胜玩家，null表示平局
   * @param {Array} [result.winLine] - 胜利连线
   * @param {string} [result.reason] - 结束原因
   */
  finishGame(result) {
    this.gameStatus = 'finished';
    this.winner = result.winner;
    this.winLine = result.winLine || null;
    this.endTime = Date.now();

    if (this.eventBus) {
      this.eventBus.emit('game:finished', {
        winner: this.winner,
        winLine: this.winLine,
        reason: result.reason || 'five_in_row',
        duration: this.endTime - this.startTime
      });
      this.eventBus.emit('state:changed', this.getSnapshot());
    }
  }

  /**
   * 获取状态快照（深拷贝）
   * @returns {Object}
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify({
      board: this.board,
      currentPlayer: this.currentPlayer,
      moveHistory: this.moveHistory,
      mode: this.mode,
      settings: this.settings,
      gameStatus: this.gameStatus,
      winner: this.winner,
      winLine: this.winLine,
      startTime: this.startTime,
      endTime: this.endTime,
      boardSize: this.boardSize
    }));
  }

  /**
   * 从快照恢复状态
   * @param {Object} snapshot
   */
  restoreSnapshot(snapshot) {
    this.board = JSON.parse(JSON.stringify(snapshot.board));
    this.currentPlayer = snapshot.currentPlayer;
    this.moveHistory = JSON.parse(JSON.stringify(snapshot.moveHistory));
    this.mode = snapshot.mode;
    this.settings = JSON.parse(JSON.stringify(snapshot.settings));
    this.gameStatus = snapshot.gameStatus;
    this.winner = snapshot.winner;
    this.winLine = snapshot.winLine;
    this.startTime = snapshot.startTime;
    this.endTime = snapshot.endTime;
    this.boardSize = snapshot.boardSize || 15;

    if (this.eventBus) {
      this.eventBus.emit('state:restored', this.getSnapshot());
      this.eventBus.emit('state:changed', this.getSnapshot());
    }
  }

  /**
   * 获取游戏持续时间
   * @returns {number} 毫秒
   */
  getDuration() {
    if (!this.startTime) return 0;
    const endTime = this.endTime || Date.now();
    return endTime - this.startTime;
  }

  /**
   * 检查游戏是否可以继续（未结束且有空位）
   * @returns {boolean}
   */
  canContinue() {
    if (this.gameStatus === 'finished') return false;

    for (let y = 0; y < this.boardSize; y += 1) {
      for (let x = 0; x < this.boardSize; x += 1) {
        if (this.board[y][x] === 0) return true;
      }
    }
    return false;
  }
}

GameState.__moduleInfo = {
  name: 'GameState',
  version: '2.0.0',
  dependencies: ['EventBus']
};

if (typeof window !== 'undefined') {
  window.GameState = GameState;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: GameState.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameState;
}

export default GameState;
