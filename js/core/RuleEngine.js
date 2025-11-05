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
    // 活三的标准模式：
    // 1. _XXX_ (01110) - 连续三子，两端开放
    // 2. _XX_X_ (01101) - 跳一活三
    // 3. _X_XX_ (01011) - 跳一活三
    
    const patterns = [
      [0, 1, 1, 1, 0],       // 01110 连三
      [0, 1, 1, 0, 1, 0],    // 011010 跳三
      [0, 1, 0, 1, 1, 0]     // 010110 跳三
    ];
    
    const foundThrees = new Set();
    
    for (const pattern of patterns) {
      const patternLen = pattern.length;
      
      // 滑动窗口查找该模式
      for (let start = 0; start <= line.length - patternLen; start += 1) {
        const end = start + patternLen - 1;
        
        // 检查中心点是否在此窗口内
        if (centerIndex < start || centerIndex > end) continue;
        
        const window = line.slice(start, end + 1);
        
        // 检查窗口是否匹配模式
        let matches = true;
        let piecePositions = [];
        for (let i = 0; i < patternLen; i += 1) {
          if (pattern[i] === 1 && window[i] !== 1) {
            matches = false;
            break;
          }
          if (pattern[i] === 0 && window[i] !== 0) {
            matches = false;
            break;
          }
          if (pattern[i] === 1) {
            piecePositions.push(start + i);
          }
        }
        
        if (!matches) continue;
        
        // 使用棋子的实际位置作为去重key
        const key = piecePositions.join(',');
        if (!foundThrees.has(key)) {
          foundThrees.add(key);
        }
      }
    }
    
    return foundThrees.size;
  }

  /**
   * 统计四的数量
   * @param {number[]} line
   * @param {number} centerIndex
   * @returns {{openFours:number, rushFours:number}}
   */
  _countFours(line, centerIndex) {
    // 活四的标准模式：
    // 1. _XXXX_ (011110) - 连续四子，两端开放
    // 2. _XXX_X_ (0111010) - 跳一活四
    // 3. _XX_XX_ (0110110) - 跳一活四
    // 4. _X_XXX_ (0101110) - 跳一活四
    
    // 冲四：一端被堵的四
    // 1. XXXX_ 或 _XXXX (边界或对方棋子)
    // 2. XXX_X_ 或 _X_XXX (跳四，一端被堵)
    // 等等...
    
    const openFourPatterns = [
      [0, 1, 1, 1, 1, 0],          // 011110 连四
      [0, 1, 1, 1, 0, 1, 0],       // 0111010 跳四
      [0, 1, 1, 0, 1, 1, 0],       // 0110110 跳四
      [0, 1, 0, 1, 1, 1, 0]        // 0101110 跳四
    ];
    
    const foundOpenFours = new Set();
    const foundRushFours = new Set();
    
    // 检测活四
    for (const pattern of openFourPatterns) {
      const patternLen = pattern.length;
      
      for (let start = 0; start <= line.length - patternLen; start += 1) {
        const end = start + patternLen - 1;
        
        if (centerIndex < start || centerIndex > end) continue;
        
        const window = line.slice(start, end + 1);
        
        let matches = true;
        let piecePositions = [];
        for (let i = 0; i < patternLen; i += 1) {
          if (pattern[i] === 1 && window[i] !== 1) {
            matches = false;
            break;
          }
          if (pattern[i] === 0 && window[i] !== 0) {
            matches = false;
            break;
          }
          if (pattern[i] === 1) {
            piecePositions.push(start + i);
          }
        }
        
        if (matches) {
          const key = piecePositions.join(',');
          foundOpenFours.add(key);
        }
      }
    }
    
    // 检测冲四：寻找恰好4个己方棋子，且只有一端开放的情况
    // 扫描5-7长度的窗口
    for (let len = 5; len <= 7; len += 1) {
      for (let start = 0; start <= line.length - len; start += 1) {
        const end = start + len - 1;
        
        if (centerIndex < start || centerIndex > end) continue;
        
        const window = line.slice(start, end + 1);
        
        // 统计己方棋子
        const pieces = window.filter(v => v === 1).length;
        if (pieces !== 4) continue;
        
        // 检查是否包含对方棋子或边界
        const hasOpponentOrBorder = window.some(v => v === 2 || v === 3);
        if (!hasOpponentOrBorder) continue; // 如果没有被堵，可能是活四
        
        // 检查端点情况
        const leftEnd = window[0];
        const rightEnd = window[len - 1];
        
        // 冲四：一端是空，另一端是堵（对方棋子、边界）
        const isRushFour = (leftEnd === 0 && (rightEnd === 2 || rightEnd === 3)) ||
                           (rightEnd === 0 && (leftEnd === 2 || leftEnd === 3));
        
        if (isRushFour) {
          // 提取棋子位置
          const piecePositions = [];
          for (let i = 0; i < len; i += 1) {
            if (window[i] === 1) {
              piecePositions.push(start + i);
            }
          }
          
          const key = piecePositions.join(',');
          // 确保不与活四重复
          if (!foundOpenFours.has(key)) {
            foundRushFours.add(key);
          }
        }
      }
    }
    
    return { openFours: foundOpenFours.size, rushFours: foundRushFours.size };
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
