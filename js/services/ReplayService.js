/**
 * 回放服务 - 负责棋谱的播放控制
 */
class ReplayService {
  constructor(gameState, eventBus, modeManager) {
    this.state = gameState;
    this.eventBus = eventBus;
    this.modeManager = modeManager;

    this.sequence = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.speed = 1;
    this.timer = null;
    this.originalSnapshot = null;
  }

  /**
   * 从当前棋谱开始回放
   * @param {Object} [options]
   */
  startFromCurrent(options = {}) {
    const snapshot = this.state.getSnapshot();
    this.startReplay(snapshot.moveHistory, options);
  }

  /**
   * 开始回放指定棋谱
   * @param {Array} moves
   * @param {Object} [options]
   */
  startReplay(moves, options = {}) {
    if (!Array.isArray(moves) || moves.length === 0) {
      if (this.eventBus) {
        this.eventBus.emit('replay:error', { error: 'No moves to replay' });
      }
      return;
    }

    this.stop();

    this.sequence = moves.map(move => ({ ...move }));
    this.currentIndex = 0;
    this.speed = options.speed || 1;
    this.originalSnapshot = this.state.getSnapshot();

    this.modeManager.stopEvE();
    if (this.modeManager.enterReplayMode) {
      this.modeManager.enterReplayMode();
    }

    this.state.reset();
    this.state.gameStatus = 'replay';
    this.state.mode = 'Replay';

    if (this.eventBus) {
      this.eventBus.emit('replay:started', { totalMoves: this.sequence.length });
    }

    this.play();
  }

  /**
   * 播放
   */
  play() {
    if (this.sequence.length === 0) return;
    this.isPlaying = true;
    this._scheduleNext();

    if (this.eventBus) {
      this.eventBus.emit('replay:play', { index: this.currentIndex });
    }
  }

  /**
   * 暂停
   */
  pause() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.eventBus) {
      this.eventBus.emit('replay:pause', { index: this.currentIndex });
    }
  }

  /**
   * 停止回放并恢复原始状态
   */
  stop() {
    this.pause();
    if (this.originalSnapshot) {
      this.state.restoreSnapshot(this.originalSnapshot);
      this.originalSnapshot = null;
    }
    if (this.modeManager.exitReplayMode) {
      this.modeManager.exitReplayMode();
    }
    if (this.eventBus) {
      this.eventBus.emit('replay:stopped');
    }
  }

  /**
   * 单步前进
   */
  stepForward() {
    this.pause();
    if (this.currentIndex >= this.sequence.length) return;
    const move = this.sequence[this.currentIndex];
    this._applyMove(move);
    this.currentIndex += 1;
  }

  /**
   * 单步后退
   */
  stepBackward() {
    this.pause();
    if (this.currentIndex <= 0) return;

    this.state.reset();
    this.state.gameStatus = 'replay';

    this.currentIndex -= 1;
    for (let i = 0; i < this.currentIndex; i += 1) {
      this._applyMove(this.sequence[i], true);
    }

    if (this.eventBus) {
      this.eventBus.emit('replay:step', { index: this.currentIndex });
    }
  }

  /**
   * 设置回放速度
   * @param {number} speed
   */
  setSpeed(speed) {
    this.speed = Math.max(0.1, Math.min(speed, 4));
    if (this.eventBus) {
      this.eventBus.emit('replay:speed', { speed: this.speed });
    }
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  _scheduleNext() {
    if (!this.isPlaying) return;
    if (this.currentIndex >= this.sequence.length) {
      this.isPlaying = false;
      if (this.eventBus) {
        this.eventBus.emit('replay:finished');
      }
      return;
    }

    const delay = 800 / this.speed;
    this.timer = setTimeout(() => {
      const move = this.sequence[this.currentIndex];
      this._applyMove(move);
      this.currentIndex += 1;
      this._scheduleNext();
    }, delay);
  }

  _applyMove(move, silent = false) {
    const player = move.player || ((this.state.currentPlayer === 1) ? 1 : 2);

    this.state.currentPlayer = player;
    this.state.applyMove({ x: move.x, y: move.y, player });
    this.state.currentPlayer = player === 1 ? 2 : 1;

    if (!silent && this.eventBus) {
      this.eventBus.emit('replay:progress', { index: this.currentIndex + 1, move });
    }
  }
}

ReplayService.__moduleInfo = {
  name: 'ReplayService',
  version: '2.0.0',
  dependencies: ['GameState', 'ModeManager']
};

if (typeof window !== 'undefined') {
  window.ReplayService = ReplayService;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: ReplayService.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ReplayService;
}

export default ReplayService;
