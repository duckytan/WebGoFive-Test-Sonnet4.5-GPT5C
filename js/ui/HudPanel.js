/**
 * HUD面板 - 显示游戏状态、控制按钮等
 */
class HudPanel {
  constructor(gameState, eventBus) {
    this.state = gameState;
    this.eventBus = eventBus;

    this.elements = {
      status: document.getElementById('status-display'),
      mode: document.getElementById('mode-display'),
      player: document.getElementById('player-display'),
      message: document.getElementById('message-display'),
      timer: document.getElementById('timer-display'),
      playerIndicator: document.getElementById('current-player-indicator'),
      moveCounter: document.getElementById('move-counter')
    };

    this.timerInterval = null;
    this.messageTimeout = null;
    this._setupEventListeners();
  }

  _setupEventListeners() {
    if (!this.eventBus) return;

    this.eventBus.on('state:changed', () => this.update());
    this.eventBus.on('game:started', (data) => this.showMessage(`Game started: ${data.mode}`, 'info'));
    this.eventBus.on('game:finished', (data) => this.showGameResult(data));
    this.eventBus.on('move:invalid', (data) => this.showInvalidMove(data));
    this.eventBus.on('ai:thinking', (data) => {
      const playerName = data.player === 1 ? 'Black' : 'White';
      this.showMessage(`${playerName} AI is thinking...`, 'info');
    });
    this.eventBus.on('mode:changed', () => this.update());
    this.eventBus.on('replay:started', () => this.showMessage('Replay started', 'info'));
    this.eventBus.on('replay:finished', () => this.showMessage('Replay finished', 'info'));
  }

  update() {
    this.updateStatus();
    this.updateMode();
    this.updateCurrentPlayer();
    this.updateTimer();
  }

  updateStatus() {
    if (!this.elements.status) return;

    const statusMap = {
      ready: '准备中',
      playing: '对弈中',
      finished: '已结束',
      replay: '回放中'
    };

    this.elements.status.textContent = statusMap[this.state.gameStatus] || this.state.gameStatus;
  }

  updateMode() {
    if (!this.elements.mode) return;

    const difficultyMap = {
      BEGINNER: '新手',
      NORMAL: '标准',
      HARD: '困难',
      HELL: '地狱'
    };

    let modeText = '';

    if (this.state.mode === 'PvP') {
      modeText = '双人对弈 (PvP)';
    } else if (this.state.mode === 'PvE') {
      const playerSide = this.state.settings.playerSide === 1 ? '黑棋' : '白棋';
      const difficultyKey = this.state.settings.aiDifficulty;
      const difficulty = difficultyMap[difficultyKey] || difficultyKey;
      modeText = `人机对战 · 玩家执${playerSide} / AI(${difficulty})`;
    } else if (this.state.mode === 'EvE') {
      const blackAIKey = this.state.settings.blackAI;
      const whiteAIKey = this.state.settings.whiteAI;
      const blackAI = difficultyMap[blackAIKey] || blackAIKey;
      const whiteAI = difficultyMap[whiteAIKey] || whiteAIKey;
      modeText = `AI 观战 · 黑(${blackAI}) vs 白(${whiteAI})`;
    } else {
      modeText = this.state.mode;
    }

    this.elements.mode.textContent = modeText;
  }

  updateCurrentPlayer() {
    if (!this.elements.player) return;

    const playerName = this.state.currentPlayer === 1 ? '黑棋' : '白棋';
    const stepCount = this.state.moveHistory.length;
    const nextMoveIndex = stepCount + 1;

    this.elements.player.textContent = `${playerName} · 第 ${nextMoveIndex} 手`;

    if (this.elements.playerIndicator) {
      this.elements.playerIndicator.classList.remove('player-avatar--black', 'player-avatar--white');
      this.elements.playerIndicator.classList.add(
        this.state.currentPlayer === 1 ? 'player-avatar--black' : 'player-avatar--white'
      );
    }

    if (this.elements.moveCounter) {
      if (this.state.gameStatus === 'ready' && stepCount === 0) {
        this.elements.moveCounter.textContent = '等待开局';
      } else if (this.state.gameStatus === 'finished') {
        this.elements.moveCounter.textContent = `共进行 ${stepCount} 手对弈`;
      } else {
        this.elements.moveCounter.textContent = `已完成 ${stepCount} 手`;
      }
    }
  }

  updateTimer() {
    if (!this.elements.timer) return;

    if (this.state.gameStatus === 'playing') {
      if (!this.timerInterval) {
        this.timerInterval = setInterval(() => {
          const duration = this.state.getDuration();
          this.elements.timer.textContent = this.formatTime(duration);
        }, 1000);
      }
    } else {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      const duration = this.state.getDuration();
      this.elements.timer.textContent = this.formatTime(duration);
    }
  }

  formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  showMessage(text, type = 'info', duration = 3000) {
    if (!this.elements.message) return;

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }

    const exactMap = {
      'Game started': '游戏开始',
      'Move undone': '已悔棋',
      'Cannot undo': '无法悔棋',
      'Hint not available in EvE mode': 'EvE 模式不可使用提示',
      'Failed to get hint': '提示失败',
      'Game saved': '棋局已保存',
      'Failed to save': '保存失败',
      'Game loaded': '存档已加载',
      'No saved game found': '未找到存档',
      'No moves to replay': '暂无可回放步骤',
      'Starting replay...': '正在启动回放',
      'Game exported': '已导出棋谱',
      'Failed to export': '导出失败',
      'Waiting for AI...': 'AI 思考中...',
      'EvE mode is running, cannot place pieces manually': 'EvE 模式不可手动落子',
      'AI is thinking...': 'AI 思考中...'
    };

    const modeMap = {
      PvP: '双人对弈',
      PvE: '人机对战',
      EvE: 'AI 观战'
    };

    const difficultyMap = {
      BEGINNER: '新手',
      NORMAL: '标准',
      HARD: '困难',
      HELL: '地狱'
    };

    const sideMap = {
      Black: '黑方',
      White: '白方',
      'Black AI': '黑方 AI',
      'White AI': '白方 AI'
    };

    let displayText = exactMap[text] || text;

    if (displayText === text) {
      if (text.startsWith('Game started')) {
        const modeInfo = text.split(':').slice(1).join(':').trim();
        const baseMode = modeInfo.split('(')[0].trim();
        const localizedBase = modeMap[baseMode] || baseMode;
        let extra = '';
        const detailMatch = modeInfo.match(/\((.*)\)/);
        if (detailMatch && detailMatch[1]) {
          const tokens = detailMatch[1].split(/,\s*/).map(part => {
            let item = part.trim();
            item = item.replace('You:', '玩家:').replace('AI:', 'AI:');
            item = item.replace('Black', '黑棋').replace('White', '白棋');
            Object.entries(difficultyMap).forEach(([key, value]) => {
              item = item.replace(key, value);
            });
            return item;
          });
          extra = `（${tokens.join('，')}）`;
        }
        displayText = `游戏开始 · ${localizedBase}${extra}`;
      } else if (text.startsWith('Mode changed to')) {
        const modeKey = text.replace('Mode changed to', '').trim();
        const localizedMode = modeMap[modeKey] || modeKey;
        displayText = `模式切换至 ${localizedMode}`;
      } else if (text.startsWith('Hint:')) {
        const hint = text.replace('Hint:', '').trim();
        displayText = `推荐落子：${hint}`;
      } else if (text.endsWith('AI is thinking...')) {
        const prefix = text.replace('AI is thinking...', '').trim();
        if (prefix) {
          const localizedPrefix = sideMap[prefix] || prefix
            .replace('Black', '黑方')
            .replace('White', '白方');
          displayText = `${localizedPrefix} AI 思考中...`;
        } else {
          displayText = 'AI 思考中...';
        }
      }
    }

    this.elements.message.textContent = displayText;
    this.elements.message.className = `message message-${type}`;
    this.elements.message.style.display = 'block';

    if (duration > 0) {
      this.messageTimeout = setTimeout(() => {
        this.elements.message.style.display = 'none';
        this.messageTimeout = null;
      }, duration);
    }
  }

  showGameResult(data) {
    let message = '';
    if (data.winner === null) {
      message = 'Game ended in a draw';
    } else {
      const winnerName = data.winner === 1 ? 'Black' : 'White';
      message = `${winnerName} wins!`;
    }

    const duration = this.formatTime(data.duration || 0);
    this.showMessage(`${message} (${duration})`, 'success', 5000);
  }

  showInvalidMove(data) {
    let message = 'Invalid move';
    if (data.error === 'forbidden_move' && data.forbiddenInfo) {
      const typeMap = {
        double_three: 'Double Three Forbidden',
        double_four: 'Double Four Forbidden',
        long_line: 'Long Line Forbidden (>=6)'
      };
      message = typeMap[data.forbiddenInfo.type] || 'Forbidden move';
    } else if (data.error === 'position_occupied') {
      message = 'Position already occupied';
    } else if (data.error === 'out_of_bounds') {
      message = 'Position out of bounds';
    }

    this.showMessage(message, 'error', 2000);
  }

  clearMessage() {
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
    if (this.elements.message) {
      this.elements.message.style.display = 'none';
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
      this.messageTimeout = null;
    }
  }
}

HudPanel.__moduleInfo = {
  name: 'HudPanel',
  version: '2.0.0',
  dependencies: ['GameState']
};

if (typeof window !== 'undefined') {
  window.HudPanel = HudPanel;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: HudPanel.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HudPanel;
}

export default HudPanel;
