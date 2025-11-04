/**
 * 模式管理器 - 负责PvP/PvE/EvE模式切换和流程控制
 */
import Logger from '../utils/Logger.js';

class ModeManager {
  constructor(gameState, aiEngine, ruleEngine, eventBus) {
    this.state = gameState;
    this.ai = aiEngine;
    this.rules = ruleEngine;
    this.eventBus = eventBus;
    this.logger = new Logger('ModeManager');
    
    this.currentMode = 'PvP';
    this.eveAutoPlay = false;
    this.eveIntervalId = null;
    this.isReplayMode = false;
  }

  /**
   * 设置游戏模式
   * @param {string} mode - PvP | PvE | EvE
   * @param {Object} [options]
   * @param {string} [options.aiDifficulty] - AI难度（PvE模式）
   * @param {string} [options.blackAI] - 黑方AI难度（EvE模式）
   * @param {string} [options.whiteAI] - 白方AI难度（EvE模式）
   * @param {number} [options.playerSide] - 玩家执哪方（PvE模式，1=黑，2=白）
   */
  setMode(mode, options = {}) {
    if (!['PvP', 'PvE', 'EvE'].includes(mode)) {
      throw new Error(`Invalid mode: ${mode}`);
    }

    this.stopEvE();
    this.currentMode = mode;
    this.state.mode = mode;

    if (mode === 'PvE') {
      this.state.settings.aiDifficulty = options.aiDifficulty || 'NORMAL';
      this.state.settings.playerSide = options.playerSide || 1;
      const aiSide = this.state.settings.playerSide === 1 ? 2 : 1;
      this.ai.setDifficulty(aiSide, this.state.settings.aiDifficulty);
    } else if (mode === 'EvE') {
      this.state.settings.blackAI = options.blackAI || 'NORMAL';
      this.state.settings.whiteAI = options.whiteAI || 'HARD';
      this.ai.setDifficulty(1, this.state.settings.blackAI);
      this.ai.setDifficulty(2, this.state.settings.whiteAI);
    }

    this.logger.info(`Mode changed to ${mode}`, options);
    if (this.eventBus) {
      this.eventBus.emit('mode:changed', { mode, options });
    }
  }

  /**
   * 处理玩家落子或AI落子
   * @param {number} x
   * @param {number} y
   * @returns {Promise<boolean>} 是否成功
   */
  async handleMove(x, y) {
    if (this.isReplayMode) {
      this.logger.warn('Replay mode active, ignore moves');
      return false;
    }

    if (this.state.gameStatus === 'finished') {
      this.logger.warn('Game already finished');
      return false;
    }

    const validation = this.rules.validateMove(x, y, this.state.currentPlayer);
    if (!validation.valid) {
      this.logger.warn('Invalid move', validation);
      if (this.eventBus) {
        this.eventBus.emit('move:invalid', { ...validation, x, y, player: this.state.currentPlayer });
      }
      return false;
    }

    const moveResult = this.state.applyMove({ x, y });
    if (!moveResult.success) {
      this.logger.error('Failed to apply move', moveResult);
      return false;
    }

    const winCheck = this.rules.checkWin(x, y, this.state.currentPlayer);
    if (winCheck.isWin) {
      this.state.finishGame({
        winner: this.state.currentPlayer,
        winLine: winCheck.winLine,
        reason: 'five_in_row'
      });
      this.stopEvE();
      return true;
    }

    if (!this.state.canContinue()) {
      this.state.finishGame({ winner: null, reason: 'draw' });
      this.stopEvE();
      return true;
    }

    this.state.switchPlayer();

    if (this.shouldAIMove()) {
      setTimeout(() => this.triggerAIMove(), 300);
    }

    return true;
  }

  /**
   * 触发AI计算并自动落子
   */
  async triggerAIMove() {
    if (this.state.gameStatus === 'finished') {
      return;
    }

    const player = this.state.currentPlayer;
    try {
      const move = await this.ai.computeMove(player);
      await this.handleMove(move.x, move.y);
    } catch (error) {
      this.logger.error('AI move error:', error);
      if (this.eventBus) {
        this.eventBus.emit('ai:error', { player, error: error.message });
      }
    }
  }

  /**
   * 判断当前是否应该由AI落子
   * @returns {boolean}
   */
  shouldAIMove() {
    if (this.isReplayMode) return false;
    if (this.state.gameStatus === 'finished') return false;
    if (this.currentMode === 'PvP') return false;
    if (this.currentMode === 'EvE') return this.eveAutoPlay;
    if (this.currentMode === 'PvE') {
      const playerSide = this.state.settings.playerSide;
      return this.state.currentPlayer !== playerSide;
    }
    return false;
  }

  /**
   * 悔棋
   * @returns {boolean}
   */
  undo() {
    if (this.currentMode === 'EvE' && this.eveAutoPlay) {
      this.logger.warn('Cannot undo in EvE auto-play mode');
      return false;
    }

    const result = this.state.undoMove();
    if (result.success && this.currentMode === 'PvE') {
      const playerSide = this.state.settings.playerSide;
      const lastMove = this.state.moveHistory[this.state.moveHistory.length - 1];
      if (lastMove && lastMove.player !== playerSide) {
        this.state.undoMove();
      }
    }
    return result.success;
  }

  /**
   * 开始新游戏
   */
  startNewGame() {
    this.stopEvE();
    this.isReplayMode = false;
    this.state.reset();
    this.state.mode = this.currentMode;
    this.state.gameStatus = 'ready';

    if (this.eventBus) {
      this.eventBus.emit('game:started', { mode: this.currentMode, settings: this.state.settings });
    }

    if (this.currentMode === 'EvE') {
      this.startEvE();
    } else if (this.currentMode === 'PvE' && this.state.settings.playerSide === 2) {
      setTimeout(() => this.triggerAIMove(), 500);
    }
  }

  /**
   * 启动EvE自动对战
   */
  startEvE() {
    if (this.currentMode !== 'EvE') {
      this.logger.warn('Not in EvE mode');
      return;
    }

    this.eveAutoPlay = true;
    this.logger.info('EvE auto-play started');

    if (this.state.gameStatus === 'ready') {
      this.state.gameStatus = 'playing';
      this.state.startTime = Date.now();
    }

    this.triggerAIMove();
  }

  /**
   * 停止EvE自动对战
   */
  stopEvE() {
    if (this.eveIntervalId) {
      clearInterval(this.eveIntervalId);
      this.eveIntervalId = null;
    }
    this.eveAutoPlay = false;
    this.logger.info('EvE auto-play stopped');
  }

  /**
   * 请求AI提示
   * @returns {Promise<{x:number, y:number}>}
   */
  async requestHint() {
    if (this.currentMode === 'EvE') {
      this.logger.warn('Hint not available in EvE mode');
      return null;
    }

    const player = this.state.currentPlayer;
    return this.ai.getHint(player);
  }

  /**
   * 进入回放模式
   */
  enterReplayMode() {
    this.isReplayMode = true;
    this.stopEvE();
  }

  /**
   * 退出回放模式
   */
  exitReplayMode() {
    this.isReplayMode = false;
  }
}

ModeManager.__moduleInfo = {
  name: 'ModeManager',
  version: '2.0.0',
  dependencies: ['GameState', 'AIEngine', 'RuleEngine', 'EventBus']
};

if (typeof window !== 'undefined') {
  window.ModeManager = ModeManager;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: ModeManager.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModeManager;
}

export default ModeManager;
