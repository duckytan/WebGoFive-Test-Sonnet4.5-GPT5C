/**
 * 存储工具 - LocalStorage 包装
 */
class StorageUtils {
  static isSupported() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  static setJSON(key, value) {
    if (!StorageUtils.isSupported()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  static getJSON(key, defaultValue = null) {
    if (!StorageUtils.isSupported()) return defaultValue;
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return defaultValue;
    }
  }

  static remove(key) {
    if (!StorageUtils.isSupported()) return;
    window.localStorage.removeItem(key);
  }
}

StorageUtils.__moduleInfo = {
  name: 'StorageUtils',
  version: '2.0.0',
  dependencies: []
};

if (typeof window !== 'undefined') {
  window.StorageUtils = StorageUtils;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: StorageUtils.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageUtils;
}

export default StorageUtils;
