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
      timer: document.getElementById('timer-display')
    };

    this.timerInterval = null;
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
      ready: 'Ready',
      playing: 'Playing',
      finished: 'Finished',
      replay: 'Replay'
    };

    this.elements.status.textContent = statusMap[this.state.gameStatus] || this.state.gameStatus;
  }

  updateMode() {
    if (!this.elements.mode) return;

    let modeText = this.state.mode;
    if (this.state.mode === 'PvE') {
      const playerSide = this.state.settings.playerSide === 1 ? 'Black' : 'White';
      const difficulty = this.state.settings.aiDifficulty;
      modeText = `PvE (You: ${playerSide}, AI: ${difficulty})`;
    } else if (this.state.mode === 'EvE') {
      const blackAI = this.state.settings.blackAI;
      const whiteAI = this.state.settings.whiteAI;
      modeText = `EvE (Black: ${blackAI} vs White: ${whiteAI})`;
    }

    this.elements.mode.textContent = modeText;
  }

  updateCurrentPlayer() {
    if (!this.elements.player) return;

    const playerName = this.state.currentPlayer === 1 ? 'Black' : 'White';
    const stepCount = this.state.moveHistory.length;

    this.elements.player.textContent = `${playerName} (Move ${stepCount + 1})`;
    this.elements.player.style.color = this.state.currentPlayer === 1 ? '#000' : '#666';
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

    this.elements.message.textContent = text;
    this.elements.message.className = `message message-${type}`;
    this.elements.message.style.display = 'block';

    if (duration > 0) {
      setTimeout(() => {
        this.elements.message.style.display = 'none';
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
    if (this.elements.message) {
      this.elements.message.style.display = 'none';
    }
  }

  destroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
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
