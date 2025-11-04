/**
 * 存档加载服务 - 负责游戏状态的保存和加载
 */
import StorageUtils from '../utils/StorageUtils.js';

class SaveLoadService {
  static STORAGE_KEYS = {
    LAST_GAME: 'gomoku:lastGameState',
    SETTINGS: 'gomoku:settings',
    AUTO_SAVES: 'gomoku:autoSaves'
  };

  constructor(gameState, eventBus) {
    this.state = gameState;
    this.eventBus = eventBus;
  }

  /**
   * 保存当前游戏状态
   * @param {string} [name] - 保存名称
   * @returns {{success: boolean, error?: string}}
   */
  save(name = 'manual_save') {
    try {
      const snapshot = this.state.getSnapshot();
      const saveData = {
        version: '2.0.0',
        name,
        timestamp: Date.now(),
        snapshot
      };

      StorageUtils.setJSON(SaveLoadService.STORAGE_KEYS.LAST_GAME, saveData);

      const autoSaves = StorageUtils.getJSON(SaveLoadService.STORAGE_KEYS.AUTO_SAVES, []);
      autoSaves.unshift(saveData);
      if (autoSaves.length > 10) {
        autoSaves.pop();
      }
      StorageUtils.setJSON(SaveLoadService.STORAGE_KEYS.AUTO_SAVES, autoSaves);

      if (this.eventBus) {
        this.eventBus.emit('save:completed', { name, timestamp: saveData.timestamp });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 加载游戏状态
   * @param {Object} [saveData] - 如果不提供，则加载最后一次保存
   * @returns {{success: boolean, error?: string}}
   */
  load(saveData = null) {
    try {
      if (!saveData) {
        saveData = StorageUtils.getJSON(SaveLoadService.STORAGE_KEYS.LAST_GAME);
      }

      if (!saveData || !saveData.snapshot) {
        return { success: false, error: 'No save data found' };
      }

      this.state.restoreSnapshot(saveData.snapshot);

      if (this.eventBus) {
        this.eventBus.emit('save:loaded', { name: saveData.name, timestamp: saveData.timestamp });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 导出游戏数据为JSON文件
   * @param {string} [filename]
   */
  exportJSON(filename = null) {
    const snapshot = this.state.getSnapshot();
    const exportData = {
      version: '2.0.0',
      mode: snapshot.mode,
      settings: snapshot.settings,
      moves: snapshot.moveHistory,
      result: {
        winner: snapshot.winner,
        winLine: snapshot.winLine,
        gameStatus: snapshot.gameStatus
      },
      metadata: {
        duration: snapshot.endTime - snapshot.startTime,
        exportTime: Date.now()
      }
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `gomoku_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    if (this.eventBus) {
      this.eventBus.emit('save:exported', { filename: a.download });
    }
  }

  /**
   * 从JSON文件导入游戏数据
   * @param {File} file
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async importJSON(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!data.moves || !Array.isArray(data.moves)) {
            resolve({ success: false, error: 'Invalid save data format' });
            return;
          }

          this.state.reset();
          this.state.mode = data.mode || 'PvP';
          if (data.settings) {
            this.state.settings = { ...this.state.settings, ...data.settings };
          }

          for (const move of data.moves) {
            this.state.applyMove(move);
            this.state.switchPlayer();
          }

          if (this.eventBus) {
            this.eventBus.emit('save:imported', { filename: file.name });
          }

          resolve({ success: true });
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };
      reader.readAsText(file);
    });
  }

  /**
   * 获取自动保存列表
   * @returns {Array}
   */
  getAutoSaves() {
    return StorageUtils.getJSON(SaveLoadService.STORAGE_KEYS.AUTO_SAVES, []);
  }

  /**
   * 清除所有保存
   */
  clearAll() {
    StorageUtils.remove(SaveLoadService.STORAGE_KEYS.LAST_GAME);
    StorageUtils.remove(SaveLoadService.STORAGE_KEYS.AUTO_SAVES);
    if (this.eventBus) {
      this.eventBus.emit('save:cleared');
    }
  }
}

SaveLoadService.__moduleInfo = {
  name: 'SaveLoadService',
  version: '2.0.0',
  dependencies: ['GameState', 'StorageUtils']
};

if (typeof window !== 'undefined') {
  window.SaveLoadService = SaveLoadService;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: SaveLoadService.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SaveLoadService;
}

export default SaveLoadService;
