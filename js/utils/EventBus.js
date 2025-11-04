/**
 * 事件总线 - 模块间通信的中心枢纽
 */
class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 取消订阅函数
   */
  on(event, handler) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(handler);
    return () => this.off(event, handler);
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  off(event, handler) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(h => h !== handler);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${event}:`, error);
      }
    });
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  once(event, handler) {
    const wrapper = (data) => {
      handler(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * 清除所有事件监听
   */
  clear() {
    this.listeners = {};
  }
}

EventBus.__moduleInfo = {
  name: 'EventBus',
  version: '2.0.0',
  dependencies: []
};

if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
  window.dispatchEvent(new CustomEvent('moduleLoaded', {
    detail: EventBus.__moduleInfo
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventBus;
}

export default EventBus;
