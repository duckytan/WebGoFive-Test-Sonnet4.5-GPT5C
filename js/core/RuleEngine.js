/**
 * 规则引擎 - 负责胜负判定、禁手检测、棋型分析
 */
import MathUtils from '../utils/MathUtils.js';

class RuleEngine {
  constructor(gameState, eventBus) {
    this.state = gameState;
    this.eventBus = eventBus;
  }

  /**
   * 校验落子是否合法
   * @param {number} x
   * @param {number} y
   * @param {number} [player]
   * @returns {{valid: boolean, error?: string, forbiddenInfo?: Object}}
   */
  validateMove(x, y, player = this.state.currentPlayer) {
    if (!this.state.isValidPosition(x, y)) {
      return { valid: false, error: 'out_of_bounds' };
    }

    if (this.state.board[y][x] !== 0) {
      return { valid: false, error: 'position_occupied' };
    }

    if (player === 1 && this.state.settings.forbiddenRules) {
      const forbiddenInfo = this.detectForbidden(x, y, player);
      if (forbiddenInfo.isForbidden) {
        return { valid: false, error: 'forbidden_move', forbiddenInfo };
      }
    }

    return { valid: true };
  }

  /**
   * 检查胜负
   * @param {number} x
   * @param {number} y
   * @param {number} player
   * @returns {{isWin: boolean, winLine?: Array<{x:number,y:number}>, direction?: string}}
   */
  checkWin(x, y, player) {
    const board = this.state.board;
    const winLine = [];

    for (const dir of MathUtils.BOARD_DIRECTIONS) {
      let count = 1;
      const line = [{ x, y }];

      // 正向
      let nx = x + dir.dx;
      let ny = y + dir.dy;
      while (this.state.isValidPosition(nx, ny) && board[ny][nx] === player) {
        count += 1;
        line.push({ x: nx, y: ny });
        nx += dir.dx;
        ny += dir.dy;
      }

      // 反向
      nx = x - dir.dx;
      ny = y - dir.dy;
      const prepend = [];
      while (this.state.isValidPosition(nx, ny) && board[ny][nx] === player) {
        count += 1;
        prepend.push({ x: nx, y: ny });
        nx -= dir.dx;
        ny -= dir.dy;
      }

      if (count >= 5) {
        winLine.push(...prepend.reverse(), ...line);
        return { isWin: true, winLine, direction: dir.name };
      }
    }

    return { isWin: false };
  }

  /**
   * 检测禁手（仅黑棋）
   * @param {number} x
   * @param {number} y
   * @param {number} player
   * @returns {{isForbidden: boolean, type?: string, details?: Object}}
   */
  detectForbidden(x, y, player = 1) {
    if (player !== 1 || !this.state.settings.forbiddenRules) {
      return { isForbidden: false };
    }

    const board = this.state.board;
    if (board[y][x] !== 0) {
      return { isForbidden: true, type: 'position_occupied' };
    }

    board[y][x] = player;

    try {
      const hasLongLine = MathUtils.hasLongLine(board, x, y, player);
      if (hasLongLine) {
        return {
          isForbidden: true,
          type: 'long_line',
          details: { direction: 'any', description: 'Overline detected (>=6)' }
        };
      }

      const directionStats = this._analyzeDirections(board, x, y, player);
      const openThrees = directionStats.reduce((sum, item) => sum + item.openThrees, 0);
      const openFours = directionStats.reduce((sum, item) => sum + item.openFours, 0);
      const rushFours = directionStats.reduce((sum, item) => sum + item.rushFours, 0);

      if (openFours + rushFours >= 2) {
        return {
          isForbidden: true,
          type: 'double_four',
          details: {
            openFours,
            rushFours,
            directions: directionStats
          }
        };
      }

      if (openThrees >= 2) {
        return {
          isForbidden: true,
          type: 'double_three',
          details: {
            openThrees,
            directions: directionStats
          }
        };
      }

      return { isForbidden: false };
    } finally {
      board[y][x] = 0;
    }
  }

  /**
   * 分析每个方向的棋型数据
   * @param {number[][]} board
   * @param {number} x
   * @param {number} y
   * @param {number} player
   * @returns {Array<{direction:string, openThrees:number, openFours:number, rushFours:number}>}
   */
  _analyzeDirections(board, x, y, player) {
    const result = [];
    for (const dir of MathUtils.BOARD_DIRECTIONS) {
      const line = this._getLineArray(board, x, y, dir.dx, dir.dy, player);
      const centerIndex = Math.floor(line.length / 2);
      const openThrees = this._countOpenThrees(line, centerIndex);
      const { openFours, rushFours } = this._countFours(line, centerIndex);
      result.push({ direction: dir.name, openThrees, openFours, rushFours });
    }
    return result;
  }

  /**
   * 获取指定方向的线性数组表示
   * @param {number[][]} board
   * @param {number} x
   * @param {number} y
   * @param {number} dx
   * @param {number} dy
   * @param {number} player
   * @param {number} range
   * @returns {number[]}
   */
  _getLineArray(board, x, y, dx, dy, player, range = 6) {
    const line = [];
    const size = board.length;
    for (let offset = -range; offset <= range; offset += 1) {
      if (offset === 0) {
        line.push(1);
        continue;
      }
      const nx = x + dx * offset;
      const ny = y + dy * offset;
      if (!MathUtils.inBounds(nx, ny, size)) {
        line.push(3);
      } else if (board[ny][nx] === player) {
        line.push(1);
      } else if (board[ny][nx] === 0) {
        line.push(0);
      } else {
        line.push(2);
      }
    }
    return line;
  }

  /**
   * 统计开放三数量
   * @param {number[]} line
   * @param {number} centerIndex
   * @returns {number}
   */
  _countOpenThrees(line, centerIndex) {
    const seen = new Set();
    let count = 0;
    const lengths = [7];

    for (const length of lengths) {
      for (let start = 0; start <= line.length - length; start += 1) {
        const end = start + length - 1;
        if (centerIndex < start || centerIndex > end) continue;
        const window = line.slice(start, end + 1);
        if (window.includes(2) || window.includes(3)) continue;
        if (!(window[0] === 0 && window[window.length - 1] === 0)) continue;
        const pieces = window.filter(v => v === 1).length;
        const empties = window.filter(v => v === 0).length;
        if (pieces !== 3 || empties < 2) continue;

        let hasPotential = false;
        for (let innerStart = 0; innerStart <= window.length - 5; innerStart += 1) {
          const inner = window.slice(innerStart, innerStart + 5);
          if (inner.includes(2) || inner.includes(3)) continue;
          const innerPieces = inner.filter(v => v === 1).length;
          const innerEndsOpen = inner[0] === 0 && inner[4] === 0;
          if (innerPieces === 3 && innerEndsOpen) {
            hasPotential = true;
            break;
          }
        }
        if (!hasPotential) continue;

        const key = `${start}-${end}`;
        if (!seen.has(key)) {
          seen.add(key);
          count += 1;
        }
      }
    }

    return count;
  }

  /**
   * 统计四的数量
   * @param {number[]} line
   * @param {number} centerIndex
   * @returns {{openFours:number, rushFours:number}}
   */
  _countFours(line, centerIndex) {
    const lengths = [6, 7];
    const seenOpen = new Set();
    const seenRush = new Set();
    let openFours = 0;
    let rushFours = 0;

    for (const length of lengths) {
      for (let start = 0; start <= line.length - length; start += 1) {
        const end = start + length - 1;
        if (centerIndex < start || centerIndex > end) continue;
        const window = line.slice(start, end + 1);
        if (window.includes(2) || window.includes(3)) continue;
        const pieces = window.filter(v => v === 1).length;
        if (pieces !== 4) continue;

        const leftEmpty = window[0] === 0;
        const rightEmpty = window[window.length - 1] === 0;

        if (leftEmpty && rightEmpty) {
          const key = `${start}-${end}`;
          if (!seenOpen.has(key)) {
            seenOpen.add(key);
            openFours += 1;
          }
        } else if (leftEmpty || rightEmpty) {
          const key = `${start}-${end}`;
          if (!seenRush.has(key)) {
            seenRush.add(key);
            rushFours += 1;
          }
        }
      }
    }

    return { openFours, rushFours };
  }
}

RuleEngine.__moduleInfo = {
  name: 'RuleEngine',
  version: '2.0.0',
  dependencies: ['GameState', 'MathUtils']
};

if (typeof window !== 'undefined') {
  window.RuleEngine = RuleEngine;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: RuleEngine.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RuleEngine;
}

export default RuleEngine;
