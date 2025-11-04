# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025

### Added
- 完整的模块化架构重构
- 核心层模块：
  - GameState: 游戏状态管理
  - RuleEngine: 规则引擎（禁手检测、胜负判定）
  - AIEngine: AI引擎（四档难度：Beginner/Normal/Hard/Hell）
  - ModeManager: 模式管理器（PvP/PvE/EvE）
- UI层模块：
  - CanvasRenderer: Canvas渲染器
  - HudPanel: 信息面板
  - DialogManager: 弹窗管理
- 服务层模块：
  - SaveLoadService: 存档服务（LocalStorage + JSON导入导出）
  - ReplayService: 回放服务（播放/暂停/步进）
- 工具层模块：
  - EventBus: 事件总线
  - Logger: 日志工具
  - MathUtils: 数学工具
  - StorageUtils: 存储工具
- 完整的禁手规则实现（三三、四四、长连）
- 三种游戏模式支持（PvP/PvE/EvE）
- AI提示功能
- 键盘快捷键支持（N=新游戏, U=悔棋, H=提示）
- 响应式布局
- 胜利连线高亮显示
- 禁手位置可视化提示

### Technical
- 使用ES2020模块系统
- 事件驱动架构，模块间松耦合
- 单一数据源状态管理
- 完整的JSDoc注释
- 模块元信息和依赖管理
- 统一的错误处理和日志系统

### Documentation
- 完整的项目文档（需求规格、架构设计、算法要点等）
- README with quick start guide
- Inline code comments
- Module information metadata

## [1.0.x] - Previous versions
- Legacy monolithic codebase
- Basic gomoku functionality
- Initial AI implementation
- See historical documentation in `doc/` directory
