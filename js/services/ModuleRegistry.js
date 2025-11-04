/**
 * 模块注册中心 - 维护模块元信息和依赖关系
 */
class ModuleRegistry {
  constructor(eventBus = null) {
    this.eventBus = eventBus;
    this.modules = new Map();
  }

  /**
   * 注册模块
   * @param {Object} moduleInfo - 模块元信息
   * @returns {Object}
   */
  register(moduleInfo) {
    if (!moduleInfo || !moduleInfo.name) {
      throw new Error('moduleInfo.name is required');
    }

    const info = {
      version: '0.0.0',
      dependencies: [],
      optionalDependencies: [],
      author: 'unknown',
      ...moduleInfo
    };

    this.modules.set(info.name, info);

    if (this.eventBus) {
      this.eventBus.emit('module:registered', info);
    }

    return info;
  }

  /**
   * 注入实例并自动注册模块信息
   * @param {string} name
   * @param {Object} instance
   */
  registerInstance(name, instance) {
    if (!instance || !instance.constructor) return;
    const info = instance.constructor.__moduleInfo || { name: instance.constructor.name };
    this.register({ ...info, name });
  }

  /**
   * 获取模块信息
   * @param {string} name
   * @returns {Object|null}
   */
  get(name) {
    return this.modules.get(name) || null;
  }

  /**
   * 列出所有模块
   * @returns {Array<Object>}
   */
  list() {
    return Array.from(this.modules.values());
  }

  /**
   * 校验依赖是否满足
   * @returns {{missing: Array<{module: string, dependency: string}>}}
   */
  checkDependencies() {
    const missing = [];

    for (const info of this.modules.values()) {
      const dependencies = info.dependencies || [];
      dependencies.forEach((dep) => {
        if (!this.modules.has(dep)) {
          missing.push({ module: info.name, dependency: dep });
        }
      });
    }

    return { missing };
  }
}

ModuleRegistry.__moduleInfo = {
  name: 'ModuleRegistry',
  version: '2.0.0',
  dependencies: ['EventBus']
};

if (typeof window !== 'undefined') {
  window.ModuleRegistry = ModuleRegistry;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: ModuleRegistry.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModuleRegistry;
}

export default ModuleRegistry;
