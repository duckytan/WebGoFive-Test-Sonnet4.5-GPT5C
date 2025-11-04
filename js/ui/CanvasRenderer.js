/**
 * Canvas渲染器 - 负责棋盘和棋子的绘制
 */
class CanvasRenderer {
  constructor(canvasId, gameState, eventBus) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error(`Canvas element with id "${canvasId}" not found`);
    }

    this.ctx = this.canvas.getContext('2d');
    this.state = gameState;
    this.eventBus = eventBus;

    this.cellSize = 36;
    this.padding = 40;
    this.pieceRadius = 15;
    this.boardSize = 15;

    this.lastMove = null;
    this.hintMove = null;
    this.forbiddenHighlight = null;
    this.hoverPosition = null;

    this._setupCanvas();
    this._setupEventListeners();
  }

  _setupCanvas() {
    const totalSize = this.boardSize * this.cellSize + this.padding * 2;
    this.canvas.width = totalSize;
    this.canvas.height = totalSize;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${totalSize}px`;
    this.canvas.style.height = `${totalSize}px`;
    this.canvas.width = totalSize * dpr;
    this.canvas.height = totalSize * dpr;
    this.ctx.scale(dpr, dpr);
  }

  _setupEventListeners() {
    this.canvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this._handleMouseLeave());
    this.canvas.addEventListener('click', (e) => this._handleClick(e));

    if (this.eventBus) {
      this.eventBus.on('state:changed', () => this.render());
      this.eventBus.on('move:applied', (data) => {
        this.lastMove = { x: data.x, y: data.y };
        this.render();
      });
      this.eventBus.on('move:invalid', (data) => {
        if (data.forbiddenInfo) {
          this.showForbidden({ x: data.x, y: data.y, ...data.forbiddenInfo });
        }
      });
    }
  }

  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridPos = this.screenToGrid(x, y);

    if (this.state.isValidPosition(gridPos.x, gridPos.y)) {
      this.hoverPosition = gridPos;
    } else {
      this.hoverPosition = null;
    }
    this.render();
  }

  _handleMouseLeave() {
    this.hoverPosition = null;
    this.render();
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridPos = this.screenToGrid(x, y);

    if (this.eventBus) {
      this.eventBus.emit('canvas:click', gridPos);
    }
  }

  /**
   * 屏幕坐标转换为棋盘坐标
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{x:number, y:number}}
   */
  screenToGrid(screenX, screenY) {
    const x = Math.round((screenX - this.padding) / this.cellSize);
    const y = Math.round((screenY - this.padding) / this.cellSize);
    return { x, y };
  }

  /**
   * 棋盘坐标转换为屏幕坐标
   * @param {number} x
   * @param {number} y
   * @returns {{x:number, y:number}}
   */
  gridToScreen(x, y) {
    return {
      x: this.padding + x * this.cellSize,
      y: this.padding + y * this.cellSize
    };
  }

  /**
   * 主渲染函数
   */
  render() {
    this.clearCanvas();
    this.drawBoard();
    this.drawStarPoints();
    this.drawCoordinates();
    this.drawPieces();
    this.drawEffects();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBoard() {
    const totalSize = this.boardSize * this.cellSize + this.padding * 2;

    this.ctx.fillStyle = '#DEB887';
    this.ctx.fillRect(0, 0, totalSize, totalSize);

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;

    for (let i = 0; i < this.boardSize; i += 1) {
      const offset = this.padding + i * this.cellSize;

      this.ctx.beginPath();
      this.ctx.moveTo(this.padding, offset);
      this.ctx.lineTo(this.padding + (this.boardSize - 1) * this.cellSize, offset);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(offset, this.padding);
      this.ctx.lineTo(offset, this.padding + (this.boardSize - 1) * this.cellSize);
      this.ctx.stroke();
    }
  }

  drawStarPoints() {
    const starPoints = [
      { x: 3, y: 3 },
      { x: 11, y: 3 },
      { x: 7, y: 7 },
      { x: 3, y: 11 },
      { x: 11, y: 11 }
    ];

    this.ctx.fillStyle = '#000';
    for (const point of starPoints) {
      const pos = this.gridToScreen(point.x, point.y);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawCoordinates() {
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#333';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i < this.boardSize; i += 1) {
      const pos = this.padding + i * this.cellSize;
      const label = String.fromCharCode(65 + i);
      this.ctx.fillText(label, pos, this.padding - 20);
      this.ctx.fillText(label, pos, this.padding + (this.boardSize - 1) * this.cellSize + 20);
    }

    for (let i = 0; i < this.boardSize; i += 1) {
      const pos = this.padding + i * this.cellSize;
      const label = String(i + 1);
      this.ctx.fillText(label, this.padding - 20, pos);
      this.ctx.fillText(label, this.padding + (this.boardSize - 1) * this.cellSize + 20, pos);
    }
  }

  drawPieces() {
    for (let y = 0; y < this.boardSize; y += 1) {
      for (let x = 0; x < this.boardSize; x += 1) {
        const piece = this.state.board[y][x];
        if (piece !== 0) {
          this.drawPiece(x, y, piece);
        }
      }
    }
  }

  drawPiece(x, y, player) {
    const pos = this.gridToScreen(x, y);

    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);

    if (player === 1) {
      const gradient = this.ctx.createRadialGradient(pos.x - 5, pos.y - 5, 2, pos.x, pos.y, this.pieceRadius);
      gradient.addColorStop(0, '#555');
      gradient.addColorStop(1, '#000');
      this.ctx.fillStyle = gradient;
    } else {
      const gradient = this.ctx.createRadialGradient(pos.x - 5, pos.y - 5, 2, pos.x, pos.y, this.pieceRadius);
      gradient.addColorStop(0, '#fff');
      gradient.addColorStop(1, '#ddd');
      this.ctx.fillStyle = gradient;
    }

    this.ctx.fill();
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  drawEffects() {
    if (this.hoverPosition && this.state.board[this.hoverPosition.y][this.hoverPosition.x] === 0) {
      const pos = this.gridToScreen(this.hoverPosition.x, this.hoverPosition.y);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = this.state.currentPlayer === 1 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)';
      this.ctx.fill();
    }

    if (this.lastMove) {
      const pos = this.gridToScreen(this.lastMove.x, this.lastMove.y);
      const player = this.state.board[this.lastMove.y][this.lastMove.x];
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius + 5, 0, Math.PI * 2);
      this.ctx.strokeStyle = player === 1 ? 'rgba(255, 215, 0, 0.8)' : 'rgba(255, 105, 180, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    }

    if (this.hintMove) {
      const pos = this.gridToScreen(this.hintMove.x, this.hintMove.y);
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x - 12, pos.y);
      this.ctx.lineTo(pos.x + 12, pos.y);
      this.ctx.moveTo(pos.x, pos.y - 12);
      this.ctx.lineTo(pos.x, pos.y + 12);
      this.ctx.stroke();
    }

    if (this.forbiddenHighlight) {
      const pos = this.gridToScreen(this.forbiddenHighlight.x, this.forbiddenHighlight.y);
      this.ctx.strokeStyle = 'rgba(211, 47, 47, 0.85)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(pos.x - this.pieceRadius, pos.y - this.pieceRadius, this.pieceRadius * 2, this.pieceRadius * 2);
    }

    if (this.state.winLine && this.state.winLine.length > 0) {
      this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      const firstPos = this.gridToScreen(this.state.winLine[0].x, this.state.winLine[0].y);
      this.ctx.moveTo(firstPos.x, firstPos.y);
      for (let i = 1; i < this.state.winLine.length; i += 1) {
        const pos = this.gridToScreen(this.state.winLine[i].x, this.state.winLine[i].y);
        this.ctx.lineTo(pos.x, pos.y);
      }
      this.ctx.stroke();
    }
  }

  showHint(move) {
    this.hintMove = move;
    this.render();
    setTimeout(() => {
      this.hintMove = null;
      this.render();
    }, 2000);
  }

  showForbidden(info) {
    if (info && info.x !== undefined && info.y !== undefined) {
      this.forbiddenHighlight = { x: info.x, y: info.y };
    }
    this.render();
    setTimeout(() => {
      this.forbiddenHighlight = null;
      this.render();
    }, 2000);
  }
}

CanvasRenderer.__moduleInfo = {
  name: 'CanvasRenderer',
  version: '2.0.0',
  dependencies: ['GameState']
};

if (typeof window !== 'undefined') {
  window.CanvasRenderer = CanvasRenderer;
  window.dispatchEvent(new CustomEvent('moduleLoaded', { detail: CanvasRenderer.__moduleInfo }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasRenderer;
}

export default CanvasRenderer;
