/**
 * 数学与棋盘相关的工具函数
 */
class MathUtils {
  static BOARD_DIRECTIONS = [
    { dx: 1, dy: 0, name: 'horizontal' },
    { dx: 0, dy: 1, name: 'vertical' },
    { dx: 1, dy: 1, name: 'diagDown' },
    { dx: 1, dy: -1, name: 'diagUp' }
  ];

  static SCORE_TABLE = {
    FIVE: 1000000,
    OPEN_FOUR: 100000,
    CLOSED_FOUR: 40000,
    OPEN_THREE: 6000,
    CLOSED_THREE: 1500,
    OPEN_TWO: 400,
    CLOSED_TWO: 80
  };

  /**
   * 克隆棋盘
   * @param {number[][]} board - 棋盘矩阵
   * @returns {number[][]}
   */
  static cloneBoard(board) {
    return board.map(row => row.slice());
  }

  /**
   * 检查坐标是否在棋盘范围内
   * @param {number} x
   * @param {number} y
   * @param {number} size
   * @returns {boolean}
   */
  static inBounds(x, y, size) {
    return x >= 0 && y >= 0 && x < size && y < size;
  }

  /**
   * 获取对手棋子编号
   * @param {number} player - 当前玩家
   * @returns {number}
   */
  static getOpponent(player) {
    return player === 1 ? 2 : 1;
  }

  /**
   * 统计某一方向上的连续棋子数及开放端信息
   * @param {number[][]} board
   * @param {number} x
   * @param {number} y
   * @param {number} dx
   * @param {number} dy
   * @param {number} player
   * @returns {{count:number, openEnds:number}}
   */
  static countDirection(board, x, y, dx, dy, player) {
    const size = board.length;
    let count = 1;
    let openEnds = 0;

    // 正向
    let nx = x + dx;
    let ny = y + dy;
    while (MathUtils.inBounds(nx, ny, size) && board[ny][nx] === player) {
      count += 1;
      nx += dx;
      ny += dy;
    }
    if (MathUtils.inBounds(nx, ny, size) && board[ny][nx] === 0) {
      openEnds += 1;
    }

    // 反向
    nx = x - dx;
    ny = y - dy;
    while (MathUtils.inBounds(nx, ny, size) && board[ny][nx] === player) {
      count += 1;
      nx -= dx;
      ny -= dy;
    }
    if (MathUtils.inBounds(nx, ny, size) && board[ny][nx] === 0) {
      openEnds += 1;
    }

    return { count, openEnds };
  }

  /**
   * 基于局面评估分数
   * @param {number[][]} board
   * @param {number} player
   * @returns {number}
   */
  static evaluateBoard(board, player) {
    const size = board.length;
    let score = 0;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (board[y][x] !== player) continue;

        for (const dir of MathUtils.BOARD_DIRECTIONS) {
          const prevX = x - dir.dx;
          const prevY = y - dir.dy;
          if (MathUtils.inBounds(prevX, prevY, size) && board[prevY][prevX] === player) {
            continue; // 避免重复统计相同线段
          }

          const { count, openEnds } = MathUtils.countDirection(board, x, y, dir.dx, dir.dy, player);

          if (count >= 5) {
            score += MathUtils.SCORE_TABLE.FIVE;
          } else if (count === 4) {
            if (openEnds === 2) {
              score += MathUtils.SCORE_TABLE.OPEN_FOUR;
            } else if (openEnds === 1) {
              score += MathUtils.SCORE_TABLE.CLOSED_FOUR;
            }
          } else if (count === 3) {
            if (openEnds === 2) {
              score += MathUtils.SCORE_TABLE.OPEN_THREE;
            } else if (openEnds === 1) {
              score += MathUtils.SCORE_TABLE.CLOSED_THREE;
            }
          } else if (count === 2) {
            if (openEnds === 2) {
              score += MathUtils.SCORE_TABLE.OPEN_TWO;
            } else if (openEnds === 1) {
              score += MathUtils.SCORE_TABLE.CLOSED_TWO;
            }
          }
        }
      }
    }

    return score;
  }

  /**
   * 返回候选落子点，根据已落子周围一定范围生成
   * @param {number[][]} board
   * @param {number} radius
   * @returns {{x:number, y:number, weight:number}[]}
   */
  static generateCandidateMoves(board, radius = 2) {
    const size = board.length;
    const candidates = new Map();
    const center = (size - 1) / 2;
    let hasAnyPiece = false;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (board[y][x] !== 0) {
          hasAnyPiece = true;
          for (let dx = -radius; dx <= radius; dx += 1) {
            for (let dy = -radius; dy <= radius; dy += 1) {
              const nx = x + dx;
              const ny = y + dy;
              if (!MathUtils.inBounds(nx, ny, size)) continue;
              if (board[ny][nx] !== 0) continue;

              const key = `${nx},${ny}`;
              const distanceToCenter = Math.abs(nx - center) + Math.abs(ny - center);
              const neighborWeight = Math.max(0, (radius * 2 + 1) - (Math.abs(dx) + Math.abs(dy)));
              const weight = candidates.get(key)?.weight ?? 0;
              candidates.set(key, {
                x: nx,
                y: ny,
                weight: weight + neighborWeight + (20 - distanceToCenter)
              });
            }
          }
        }
      }
    }

    if (!hasAnyPiece) {
      const mid = Math.floor(size / 2);
      return [{ x: mid, y: mid, weight: 1000 }];
    }

    return Array.from(candidates.values()).sort((a, b) => b.weight - a.weight);
  }

  /**
   * 检查棋盘是否已满
   * @param {number[][]} board
   * @returns {boolean}
   */
  static isBoardFull(board) {
    for (let y = 0; y < board.length; y += 1) {
      for (let x = 0; x < board.length; x += 1) {
        if (board[y][x] === 0) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 检查长连
   * @param {number[][]} board
   * @param {number} x
   * @param {number} y
   * @param {number} player
   * @returns {boolean}
   */
  static hasLongLine(board, x, y, player) {
    for (const dir of MathUtils.BOARD_DIRECTIONS) {
      const { count } = MathUtils.countDirection(board, x, y, dir.dx, dir.dy, player);
      if (count >= 6) {
        return true;
      }
    }
    return false;
  }
}

MathUtils.__moduleInfo = {
  name: 'MathUtils',
  version: '2.0.0',
  dependencies: []
};

if (typeof window !== 'undefined') {
  window.MathUtils = MathUtils;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: MathUtils.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathUtils;
}

export default MathUtils;
