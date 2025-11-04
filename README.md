# H5 五子棋 v2.0

一个基于 HTML5 Canvas 的纯前端五子棋游戏，完整实现禁手规则、多级 AI 和回放功能。

## 功能特性

### 游戏模式
- **PvP 模式**: 双人本地对战，支持悔棋
- **PvE 模式**: 玩家 vs AI，可选 4 种难度
- **EvE 模式**: 双 AI 自动对战（观战模式）

### 核心功能
- ✅ 完整禁手规则（黑棋三三、四四、长连）
- ✅ 四档 AI 难度（Beginner / Normal / Hard / Hell）
- ✅ 胜负判定和五连检测
- ✅ 棋局存档/加载
- ✅ 棋谱导出为 JSON
- ✅ 回放系统（播放/暂停/步进）
- ✅ AI 落子提示
- ✅ 响应式布局

## 技术架构

### 技术栈
- **语言**: JavaScript ES2020
- **渲染**: HTML5 Canvas 2D API
- **架构**: MVC + 事件驱动
- **存储**: LocalStorage + JSON

### 模块结构
```
js/
├── core/                 # 核心层
│   ├── GameState.js      # 游戏状态管理
│   ├── RuleEngine.js     # 规则引擎（禁手、胜负判定）
│   ├── AIEngine.js       # AI 引擎（四档策略）
│   └── ModeManager.js    # 模式管理器（PvP/PvE/EvE）
├── ui/                   # UI层
│   ├── CanvasRenderer.js # Canvas 渲染器
│   ├── HudPanel.js       # 信息面板
│   └── DialogManager.js  # 弹窗管理
├── services/             # 服务层
│   ├── SaveLoadService.js # 存档服务
│   └── ReplayService.js  # 回放服务
├── utils/                # 工具层
│   ├── EventBus.js       # 事件总线
│   ├── Logger.js         # 日志工具
│   ├── MathUtils.js      # 数学工具
│   └── StorageUtils.js   # 存储工具
└── main.js               # 入口文件
```

## 快速开始

### 本地运行
```bash
# 克隆项目
git clone <repo-url>
cd h5-gomoku

# 使用 HTTP 服务器运行
python3 -m http.server 8080
# 或
npx http-server -p 8080

# 打开浏览器访问
http://localhost:8080
```

### 游戏说明

#### 禁手规则（仅黑棋）
- **三三禁手**: 一步棋形成 ≥2 个活三
- **四四禁手**: 一步棋形成 ≥2 个四（活四/冲四）
- **长连禁手**: 一步棋形成 ≥6 连

#### AI 难度
| 难度 | 算法 | 响应时间 | 适合对象 |
|------|------|----------|----------|
| Beginner | 随机 + 简单防守 | < 600ms | 初学者 |
| Normal | Minimax + Alpha-Beta | < 1000ms | 普通玩家 |
| Hard | 深度搜索 + 候选优化 | < 2000ms | 有经验玩家 |
| Hell | 威胁检测 + 深层剪枝 | < 2400ms | 高手 |

## 开发指南

### 项目结构
本项目采用清晰的分层架构：
- **数据层**: `GameState` 管理游戏状态
- **逻辑层**: `RuleEngine` 和 `AIEngine` 处理规则和 AI
- **应用层**: `ModeManager` 控制游戏流程
- **展示层**: `CanvasRenderer` 和 `HudPanel` 处理 UI
- **服务层**: 存档、回放等辅助功能

### 事件系统
模块间通过 `EventBus` 通信，避免直接依赖：
```javascript
// 发布事件
eventBus.emit('move:applied', { x, y, player });

// 订阅事件
eventBus.on('move:applied', (data) => {
  console.log('Move applied:', data);
});
```

### 扩展功能
要添加新功能：
1. 确定功能所属层级
2. 创建新模块或扩展现有模块
3. 通过 `EventBus` 与其他模块通信
4. 更新 `main.js` 集成新模块

## 文档

完整的项目文档位于 `doc/` 目录：
- **需求规格**: `01_项目需求规格说明书.md`
- **架构设计**: `02_技术架构设计文档.md`
- **算法要点**: `03_游戏规则与AI算法要点.md`
- **UI规范**: `04_UI设计与交互规范.md`
- **任务规划**: `05_重新开发任务规划清单.md`
- **最佳实践**: `06_开发建议与最佳实践.md`

## 浏览器兼容性

支持现代浏览器：
- Chrome 95+
- Edge 95+
- Firefox 95+
- Safari 15+

## 版本历史

### v2.0.0 (2025)
- 完全重构，采用模块化架构
- 完整实现禁手规则
- 四档 AI 难度
- PvP/PvE/EvE 三种模式
- 存档回放系统
- 响应式 UI

## 许可证

MIT License

## 致谢

本项目根据详细的需求文档和架构设计文档开发，遵循软件工程最佳实践。
