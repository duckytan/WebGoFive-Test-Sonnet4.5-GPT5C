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
    const boardStart = this.padding;
    const boardSpan = (this.boardSize - 1) * this.cellSize;
    const boardEnd = boardStart + boardSpan;

    this.ctx.save();

    const bgGradient = this.ctx.createRadialGradient(
      totalSize / 2, totalSize / 2, 0,
      totalSize / 2, totalSize / 2, totalSize * 0.8
    );
    bgGradient.addColorStop(0, '#f9e8c5');
    bgGradient.addColorStop(0.5, '#e6c98f');
    bgGradient.addColorStop(1, '#d4a56e');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, totalSize, totalSize);

    this.ctx.save();
    this.ctx.globalAlpha = 0.08;
    const textureStep = 12;
    for (let x = -totalSize; x < totalSize * 1.8; x += textureStep) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x + totalSize * 0.5, totalSize);
      this.ctx.strokeStyle = '#9d7446';
      this.ctx.lineWidth = 1.2;
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    this.ctx.shadowBlur = 20;
    this.ctx.shadowOffsetX = 6;
    this.ctx.shadowOffsetY = 10;
    
    const borderGradient = this.ctx.createLinearGradient(
      boardStart - 8, boardStart - 8,
      boardStart - 8, boardStart + boardSpan + 8
    );
    borderGradient.addColorStop(0, 'rgba(140, 95, 50, 0.9)');
    borderGradient.addColorStop(0.5, 'rgba(116, 75, 35, 0.85)');
    borderGradient.addColorStop(1, 'rgba(100, 65, 30, 0.9)');
    this.ctx.strokeStyle = borderGradient;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(boardStart - 8, boardStart - 8, boardSpan + 16, boardSpan + 16);
    this.ctx.restore();

    this.ctx.strokeStyle = 'rgba(85, 55, 25, 0.8)';
    this.ctx.lineWidth = 1.3;
    this.ctx.lineCap = 'round';

    for (let i = 0; i < this.boardSize; i += 1) {
      const offset = boardStart + i * this.cellSize;

      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
      this.ctx.shadowBlur = 2;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      this.ctx.beginPath();
      this.ctx.moveTo(boardStart, offset);
      this.ctx.lineTo(boardEnd, offset);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(offset, boardStart);
      this.ctx.lineTo(offset, boardEnd);
      this.ctx.stroke();
      
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(70, 45, 20, 0.9)';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(boardStart, boardStart, boardSpan, boardSpan);
    this.ctx.restore();

    this.ctx.restore();
  }

  drawStarPoints() {
    const starPoints = [
      { x: 3, y: 3 },
      { x: 11, y: 3 },
      { x: 7, y: 7 },
      { x: 3, y: 11 },
      { x: 11, y: 11 }
    ];

    for (const point of starPoints) {
      const pos = this.gridToScreen(point.x, point.y);
      
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;
      
      const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 6);
      gradient.addColorStop(0, '#2a2a2a');
      gradient.addColorStop(0.7, '#1a1a1a');
      gradient.addColorStop(1, 'rgba(10, 10, 10, 0.7)');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawCoordinates() {
    this.ctx.save();
    this.ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
    this.ctx.fillStyle = 'rgba(90, 56, 20, 0.85)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    for (let i = 0; i < this.boardSize; i += 1) {
      const pos = this.padding + i * this.cellSize;
      const label = String.fromCharCode(65 + i);
      this.ctx.fillText(label, pos, this.padding - 22);
      this.ctx.fillText(label, pos, this.padding + (this.boardSize - 1) * this.cellSize + 22);
    }

    for (let i = 0; i < this.boardSize; i += 1) {
      const pos = this.padding + i * this.cellSize;
      const label = String(i + 1);
      this.ctx.fillText(label, this.padding - 22, pos);
      this.ctx.fillText(label, this.padding + (this.boardSize - 1) * this.cellSize + 22, pos);
    }

    this.ctx.restore();
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

    this.ctx.save();

    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 4;
    this.ctx.shadowOffsetY = 5;

    if (player === 1) {
      const gradient = this.ctx.createRadialGradient(
        pos.x - this.pieceRadius * 0.35,
        pos.y - this.pieceRadius * 0.35,
        this.pieceRadius * 0.1,
        pos.x,
        pos.y,
        this.pieceRadius
      );
      gradient.addColorStop(0, '#6a6a6a');
      gradient.addColorStop(0.3, '#3a3a3a');
      gradient.addColorStop(0.7, '#1a1a1a');
      gradient.addColorStop(1, '#050505');
      this.ctx.fillStyle = gradient;

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.shadowColor = 'transparent';
      const highlight = this.ctx.createRadialGradient(
        pos.x - this.pieceRadius * 0.5,
        pos.y - this.pieceRadius * 0.5,
        0,
        pos.x - this.pieceRadius * 0.5,
        pos.y - this.pieceRadius * 0.5,
        this.pieceRadius * 0.75
      );
      highlight.addColorStop(0, 'rgba(160, 160, 160, 0.8)');
      highlight.addColorStop(0.5, 'rgba(100, 100, 100, 0.3)');
      highlight.addColorStop(1, 'rgba(100, 100, 100, 0)');
      this.ctx.fillStyle = highlight;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fill();

      const innerShadow = this.ctx.createRadialGradient(
        pos.x + this.pieceRadius * 0.4,
        pos.y + this.pieceRadius * 0.4,
        0,
        pos.x + this.pieceRadius * 0.4,
        pos.y + this.pieceRadius * 0.4,
        this.pieceRadius * 0.6
      );
      innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
      innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = innerShadow;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      const gradient = this.ctx.createRadialGradient(
        pos.x - this.pieceRadius * 0.35,
        pos.y - this.pieceRadius * 0.35,
        this.pieceRadius * 0.1,
        pos.x,
        pos.y,
        this.pieceRadius
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, '#fafafa');
      gradient.addColorStop(0.7, '#e8e8e8');
      gradient.addColorStop(1, '#c8c8c8');
      this.ctx.fillStyle = gradient;

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = 'rgba(120, 120, 120, 0.7)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.shadowColor = 'transparent';
      const highlight = this.ctx.createRadialGradient(
        pos.x - this.pieceRadius * 0.45,
        pos.y - this.pieceRadius * 0.45,
        0,
        pos.x - this.pieceRadius * 0.45,
        pos.y - this.pieceRadius * 0.45,
        this.pieceRadius * 0.8
      );
      highlight.addColorStop(0, 'rgba(255, 255, 255, 1)');
      highlight.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
      highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = highlight;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fill();

      const innerShadow = this.ctx.createRadialGradient(
        pos.x + this.pieceRadius * 0.35,
        pos.y + this.pieceRadius * 0.35,
        0,
        pos.x + this.pieceRadius * 0.35,
        pos.y + this.pieceRadius * 0.35,
        this.pieceRadius * 0.65
      );
      innerShadow.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
      innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      this.ctx.fillStyle = innerShadow;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawEffects() {
    this.ctx.save();

    if (this.hoverPosition && this.state.board[this.hoverPosition.y][this.hoverPosition.x] === 0) {
      const pos = this.gridToScreen(this.hoverPosition.x, this.hoverPosition.y);
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius - 2, 0, Math.PI * 2);
      if (this.state.currentPlayer === 1) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      } else {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.8)';
      }
      this.ctx.fill();
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    if (this.lastMove) {
      const pos = this.gridToScreen(this.lastMove.x, this.lastMove.y);
      const player = this.state.board[this.lastMove.y][this.lastMove.x];

      this.ctx.save();
      const highlightColor = player === 1 ? 'rgba(255, 182, 87, 0.9)' : 'rgba(100, 181, 246, 0.9)';
      const glowColor = player === 1 ? 'rgba(255, 182, 87, 0.6)' : 'rgba(100, 181, 246, 0.6)';
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 14;

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.pieceRadius + 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = highlightColor;
      this.ctx.lineWidth = 3.5;
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (this.hintMove) {
      const pos = this.gridToScreen(this.hintMove.x, this.hintMove.y);
      
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(34, 197, 94, 0.7)';
      this.ctx.shadowBlur = 12;
      
      this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.85)';
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x - 14, pos.y);
      this.ctx.lineTo(pos.x + 14, pos.y);
      this.ctx.moveTo(pos.x, pos.y - 14);
      this.ctx.lineTo(pos.x, pos.y + 14);
      this.ctx.stroke();
      this.ctx.restore();
    }

    if (this.forbiddenHighlight) {
      const pos = this.gridToScreen(this.forbiddenHighlight.x, this.forbiddenHighlight.y);
      
      this.ctx.save();
      this.ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
      this.ctx.shadowBlur = 12;
      
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
      this.ctx.lineWidth = 4;
      this.ctx.lineJoin = 'round';
      const size = this.pieceRadius + 4;
      this.ctx.strokeRect(pos.x - size, pos.y - size, size * 2, size * 2);
      this.ctx.restore();
    }

    if (this.state.winLine && this.state.winLine.length > 0) {
      this.ctx.save();
      
      this.ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
      this.ctx.shadowBlur = 20;
      
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
      this.ctx.lineWidth = 5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.beginPath();
      const firstPos = this.gridToScreen(this.state.winLine[0].x, this.state.winLine[0].y);
      this.ctx.moveTo(firstPos.x, firstPos.y);
      for (let i = 1; i < this.state.winLine.length; i += 1) {
        const pos = this.gridToScreen(this.state.winLine[i].x, this.state.winLine[i].y);
        this.ctx.lineTo(pos.x, pos.y);
      }
      this.ctx.stroke();
      
      this.ctx.restore();
    }

    this.ctx.restore();
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
