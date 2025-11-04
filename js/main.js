/**
 * 主入口文件 - 初始化并协调所有模块
 */
import EventBus from './utils/EventBus.js';
import Logger from './utils/Logger.js';
import GameState from './core/GameState.js';
import RuleEngine from './core/RuleEngine.js';
import AIEngine from './core/AIEngine.js';
import ModeManager from './core/ModeManager.js';
import CanvasRenderer from './ui/CanvasRenderer.js';
import HudPanel from './ui/HudPanel.js';
import DialogManager from './ui/DialogManager.js';
import SaveLoadService from './services/SaveLoadService.js';
import ReplayService from './services/ReplayService.js';
import ModuleRegistry from './services/ModuleRegistry.js';

class GomokuApp {
  constructor() {
    this.logger = new Logger('GomokuApp');
    this.eventBus = new EventBus();
    this.moduleRegistry = new ModuleRegistry(this.eventBus);
    this.moduleRegistry.register(ModuleRegistry.__moduleInfo);

    this._initCore();
    this._initUI();
    this._initServices();
    this._bindControls();

    this.logger.info('Gomoku application initialized');
    this._logModuleInfo();
  }

  _initCore() {
    this.gameState = new GameState(this.eventBus);
    this.ruleEngine = new RuleEngine(this.gameState, this.eventBus);
    this.aiEngine = new AIEngine(this.gameState, this.ruleEngine, this.eventBus);
    this.modeManager = new ModeManager(
      this.gameState,
      this.aiEngine,
      this.ruleEngine,
      this.eventBus
    );

    this._registerModules([this.gameState, this.ruleEngine, this.aiEngine, this.modeManager]);
  }

  _initUI() {
    this.renderer = new CanvasRenderer('game-board', this.gameState, this.eventBus);
    this.hudPanel = new HudPanel(this.gameState, this.eventBus);
    this.dialogManager = new DialogManager(this.eventBus);

    this._registerModules([this.renderer, this.hudPanel, this.dialogManager]);

    this.eventBus.on('canvas:click', (pos) => {
      if (this.gameState.gameStatus === 'finished' || this.gameState.gameStatus === 'replay') {
        return;
      }

      if (this.gameState.mode === 'EvE' && this.modeManager.eveAutoPlay) {
        this.hudPanel.showMessage('EvE mode is running, cannot place pieces manually', 'warning');
        return;
      }

      if (this.gameState.mode === 'PvE') {
        const playerSide = this.gameState.settings.playerSide;
        if (this.gameState.currentPlayer !== playerSide) {
          this.hudPanel.showMessage('Waiting for AI...', 'info', 1000);
          return;
        }
      }

      this.modeManager.handleMove(pos.x, pos.y);
    });

    this.renderer.render();
    this.hudPanel.update();
  }

  _initServices() {
    this.saveLoadService = new SaveLoadService(this.gameState, this.eventBus);
    this.replayService = new ReplayService(this.gameState, this.eventBus, this.modeManager);

    this._registerModules([this.saveLoadService, this.replayService]);
  }

  _registerModules(instances) {
    for (const instance of instances) {
      if (instance && instance.constructor && instance.constructor.__moduleInfo) {
        this.moduleRegistry.register(instance.constructor.__moduleInfo);
      }
    }
  }

  _logModuleInfo() {
    const modules = this.moduleRegistry.list();
    this.logger.info(`Loaded ${modules.length} modules:`, modules.map(m => m.name).join(', '));

    const depCheck = this.moduleRegistry.checkDependencies();
    if (depCheck.missing.length > 0) {
      this.logger.warn('Missing dependencies:', depCheck.missing);
    } else {
      this.logger.info('All dependencies satisfied');
    }
  }

  _bindControls() {
    const newGameBtn = document.getElementById('new-game-btn');
    const undoBtn = document.getElementById('undo-btn');
    const hintBtn = document.getElementById('hint-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const replayBtn = document.getElementById('replay-btn');
    const exportBtn = document.getElementById('export-btn');

    const modePvPBtn = document.getElementById('mode-pvp-btn');
    const modePvEBtn = document.getElementById('mode-pve-btn');
    const modeEvEBtn = document.getElementById('mode-eve-btn');

    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => this.startNewGame());
    }

    if (undoBtn) {
      undoBtn.addEventListener('click', () => this.undo());
    }

    if (hintBtn) {
      hintBtn.addEventListener('click', () => this.requestHint());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.save());
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.load());
    }

    if (replayBtn) {
      replayBtn.addEventListener('click', () => this.startReplay());
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.export());
    }

    if (modePvPBtn) {
      modePvPBtn.addEventListener('click', () => this.changeMode('PvP'));
    }

    if (modePvEBtn) {
      modePvEBtn.addEventListener('click', () => this.changeMode('PvE', { aiDifficulty: 'NORMAL', playerSide: 1 }));
    }

    if (modeEvEBtn) {
      modeEvEBtn.addEventListener('click', () => this.changeMode('EvE', { blackAI: 'NORMAL', whiteAI: 'HARD' }));
    }

    document.addEventListener('keydown', (e) => this._handleKeyboard(e));
  }

  _handleKeyboard(e) {
    switch (e.key.toLowerCase()) {
      case 'n':
        this.startNewGame();
        break;
      case 'u':
        this.undo();
        break;
      case 'h':
        this.requestHint();
        break;
      case 's':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.save();
        }
        break;
      case 'l':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.load();
        }
        break;
    }
  }

  startNewGame() {
    this.modeManager.startNewGame();
    this.renderer.lastMove = null;
    this.renderer.hintMove = null;
    this.renderer.forbiddenHighlight = null;
    this.renderer.render();
    this.hudPanel.update();
    this.logger.info('New game started');
  }

  undo() {
    const success = this.modeManager.undo();
    if (success) {
      this.renderer.lastMove = null;
      this.renderer.render();
      this.hudPanel.showMessage('Move undone', 'info', 1000);
    } else {
      this.hudPanel.showMessage('Cannot undo', 'error', 1000);
    }
  }

  async requestHint() {
    if (this.gameState.mode === 'EvE') {
      this.hudPanel.showMessage('Hint not available in EvE mode', 'warning');
      return;
    }

    try {
      const hint = await this.modeManager.requestHint();
      if (hint) {
        this.renderer.showHint(hint);
        this.hudPanel.showMessage(`Hint: ${String.fromCharCode(65 + hint.x)}${hint.y + 1}`, 'info');
      }
    } catch (error) {
      this.logger.error('Hint request error:', error);
      this.hudPanel.showMessage('Failed to get hint', 'error');
    }
  }

  save() {
    const result = this.saveLoadService.save();
    if (result.success) {
      this.hudPanel.showMessage('Game saved', 'success', 1000);
    } else {
      this.hudPanel.showMessage('Failed to save', 'error');
    }
  }

  load() {
    const result = this.saveLoadService.load();
    if (result.success) {
      this.renderer.render();
      this.hudPanel.update();
      this.hudPanel.showMessage('Game loaded', 'success', 1000);
    } else {
      this.hudPanel.showMessage('No saved game found', 'warning');
    }
  }

  startReplay() {
    if (this.gameState.moveHistory.length === 0) {
      this.hudPanel.showMessage('No moves to replay', 'warning');
      return;
    }

    this.replayService.startFromCurrent({ speed: 1 });
    this.hudPanel.showMessage('Starting replay...', 'info');
  }

  export() {
    try {
      this.saveLoadService.exportJSON();
      this.hudPanel.showMessage('Game exported', 'success');
    } catch (error) {
      this.logger.error('Export error:', error);
      this.hudPanel.showMessage('Failed to export', 'error');
    }
  }

  changeMode(mode, options) {
    try {
      this.modeManager.setMode(mode, options);
      this.hudPanel.update();
      this.hudPanel.showMessage(`Mode changed to ${mode}`, 'info', 1500);
      this.startNewGame();
    } catch (error) {
      this.logger.error('Mode change error:', error);
      this.hudPanel.showMessage('Failed to change mode', 'error');
    }
  }
}

let app;

if (typeof window !== 'undefined') {
  window.GomokuApp = GomokuApp;

  document.addEventListener('DOMContentLoaded', () => {
    app = new GomokuApp();
    window.gomokuApp = app;
  });
}

export default GomokuApp;
