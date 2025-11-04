/**
 * 对话框管理器 - 控制弹窗显示
 */
class DialogManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.resultDialog = document.getElementById('result-dialog');
    this.resultContent = document.getElementById('result-content');
    this.settingsDialog = document.getElementById('settings-dialog');

    this._setupEventListeners();
  }

  _setupEventListeners() {
    if (!this.eventBus) return;

    this.eventBus.on('game:finished', (data) => this.showResult(data));
    this.eventBus.on('replay:started', () => this.closeResult());
  }

  showResult(data) {
    if (!this.resultDialog || !this.resultContent) return;

    let title = '';
    if (data.winner === null) {
      title = '平局';
    } else {
      title = data.winner === 1 ? '黑棋胜利' : '白棋胜利';
    }

    const reasonMap = {
      five_in_row: '五连成功',
      draw: '棋盘已满',
      long_line: '长连禁手',
      double_three: '三三禁手',
      double_four: '四四禁手'
    };

    const reasonText = reasonMap[data.reason] || '对局结束';
    const duration = data.duration ? this._formatTime(data.duration) : '--:--';

    this.resultContent.innerHTML = `
      <h2>${title}</h2>
      <p>${reasonText}</p>
      <p>用时：${duration}</p>
      <div class="dialog-actions">
        <button id="result-close-btn" class="btn">继续</button>
      </div>
    `;

    const closeBtn = document.getElementById('result-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeResult(), { once: true });
    }

    if (typeof this.resultDialog.showModal === 'function') {
      this.resultDialog.showModal();
    } else {
      this.resultDialog.classList.add('open');
    }
  }

  closeResult() {
    if (!this.resultDialog) return;
    if (typeof this.resultDialog.close === 'function') {
      this.resultDialog.close();
    } else {
      this.resultDialog.classList.remove('open');
    }
  }

  openSettings() {
    if (!this.settingsDialog) return;
    if (typeof this.settingsDialog.showModal === 'function') {
      this.settingsDialog.showModal();
    } else {
      this.settingsDialog.classList.add('open');
    }
  }

  closeSettings() {
    if (!this.settingsDialog) return;
    if (typeof this.settingsDialog.close === 'function') {
      this.settingsDialog.close();
    } else {
      this.settingsDialog.classList.remove('open');
    }
  }

  _formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

DialogManager.__moduleInfo = {
  name: 'DialogManager',
  version: '2.0.0',
  dependencies: []
};

if (typeof window !== 'undefined') {
  window.DialogManager = DialogManager;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: DialogManager.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DialogManager;
}

export default DialogManager;
