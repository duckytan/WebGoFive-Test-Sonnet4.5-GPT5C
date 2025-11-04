/**
 * 日志工具 - 统一日志格式和级别控制
 */
class Logger {
  static Level = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    OFF: 4
  };

  constructor(moduleName, level = Logger.Level.INFO) {
    this.moduleName = moduleName;
    this.level = level;
  }

  /**
   * 判断是否应该输出日志
   * @param {number} level - 日志级别
   * @returns {boolean}
   */
  _shouldLog(level) {
    return level >= this.level;
  }

  /**
   * 格式化日志前缀
   * @param {string} levelName - 级别名称
   * @returns {string}
   */
  _formatPrefix(levelName) {
    const timestamp = new Date().toISOString().slice(11, 23);
    return `[${timestamp}] [${this.moduleName}] [${levelName}]`;
  }

  /**
   * Debug级别日志
   * @param {...*} args - 日志参数
   */
  debug(...args) {
    if (this._shouldLog(Logger.Level.DEBUG)) {
      console.log(this._formatPrefix('DEBUG'), ...args);
    }
  }

  /**
   * Info级别日志
   * @param {...*} args - 日志参数
   */
  info(...args) {
    if (this._shouldLog(Logger.Level.INFO)) {
      console.info(this._formatPrefix('INFO'), ...args);
    }
  }

  /**
   * Warn级别日志
   * @param {...*} args - 日志参数
   */
  warn(...args) {
    if (this._shouldLog(Logger.Level.WARN)) {
      console.warn(this._formatPrefix('WARN'), ...args);
    }
  }

  /**
   * Error级别日志
   * @param {...*} args - 日志参数
   */
  error(...args) {
    if (this._shouldLog(Logger.Level.ERROR)) {
      console.error(this._formatPrefix('ERROR'), ...args);
    }
  }

  /**
   * 设置日志级别
   * @param {number} level - 日志级别
   */
  setLevel(level) {
    this.level = level;
  }
}

Logger.__moduleInfo = {
  name: 'Logger',
  version: '2.0.0',
  dependencies: []
};

if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.dispatchEvent(new CustomEvent('moduleLoaded', {
    detail: Logger.__moduleInfo
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logger;
}

export default Logger;
