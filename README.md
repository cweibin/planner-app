# 个人时间管理 App (Planner App)

> 商务简约风格的多平台时间管理应用

---

## 📁 项目结构

```
planner-app/
├── 个人时间管理App-功能清单.md    # 完整功能需求文档
├── time-manager-prototype.html    # 交互式原型（可点击）
├── time-manager-prototype.py     # 原型生成脚本
└── README.md                      # 项目说明文档
```

---

## 🎯 项目概述

基于 Rental App 技术架构（FastAPI + SQLite）开发的个人时间管理应用，支持多平台运行，采用商务简约风格设计。

### 核心功能模块

1. **任务管理**
   - 任务 CRUD（创建、读取、更新、删除）
   - 任务状态管理（待办/进行中/已完成）
   - 任务优先级（高/中/低）
   - 子任务支持
   - 任务分类/标签
   - 任务看板（拖拽交互，类似 Teambition）

2. **日程管理**
   - 日程 CRUD
   - 日历视图（日/周/月）
   - 重复日程（每天/每周/每月/自定义）
   - 日程提醒

3. **习惯追踪**
   - 习惯 CRUD
   - 每日打卡
   - 连续打卡统计
   - 习惯日历

4. **统计数据**
   - 任务完成率
   - 时间分布
   - 习惯完成率
   - 统计图表（柱状图/折线图/饼图）

5. **消息通知**
   - 任务提醒
   - 日程提醒
   - 习惯打卡提醒
   - 站内消息
   - 推送通知

---

## 🚀 快速开始

### 查看交互式原型

打开 `time-manager-prototype.html` 文件，在浏览器中查看可交互的原型。

### 原型功能

#### 首页
- 今日任务列表
- 进度环形图
- 任务打卡动画

#### 看板视图
- 三列布局（待办/进行中/已完成）
- 拖拽任务到不同状态
- 实时更新任务数量

#### 日历视图
- 月历视图
- 有任务日期标记
- 选中日期查看任务

#### 习惯追踪
- 习惯卡片
- 每日打卡
- 连续天数统计

#### 统计数据
- 时间分布图表
- 完成率趋势图
- 本周成就列表

#### 交互操作
- ✅ 点击任务打勾完成
- ➕ 点击右下角 + 号添加任务
- 🔄 底部导航栏切换页面
- 📅 点击日历日期查看任务
- ✅ 点击习惯进行今日打卡
- 💫 点击任务卡片查看详情
- 🔀 拖拽任务到不同列（看板视图）

---

## 📊 技术架构参考

### 后端技术栈
- **框架**: FastAPI
- **ORM**: SQLAlchemy
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **任务调度**: APScheduler
- **缓存**: Redis

### 前端技术栈
- **移动端**: Flutter (推荐) / React Native
- **Web端**: React / Vue
- **跨平台**: Electron / Tauri

### API 设计
- RESTful API
- JWT 认证
- 分页查询
- 数据过滤和排序

---

## 📋 功能清单

详细功能需求请查看：[个人时间管理App-功能清单.md](./个人时间管理App-功能清单.md)

### 核心功能 (P0)
- [x] 用户认证（注册、登录）
- [x] 任务 CRUD
- [x] 任务状态管理
- [x] 日程 CRUD
- [x] 日历视图
- [x] 习惯 CRUD
- [x] 习惯打卡

### 重要功能 (P1)
- [ ] 子任务管理
- [ ] 任务/日程分类
- [ ] 任务优先级
- [ ] 提醒设置
- [ ] 消息通知
- [ ] 任务看板视图
- [ ] 重复任务/日程
- [ ] 习惯打卡统计

### 优化功能 (P2)
- [ ] 统计数据
- [ ] 统计图表
- [ ] 多端同步
- [ ] 离线支持
- [ ] 数据导出
- [ ] 推送通知

### 高级功能 (P3)
- [ ] AI 智能建议
- [ ] 语音输入
- [ ] 手势操作
- [ ] 主题切换
- [ ] 小组件
- [ ] 协作功能

---

## 🎨 设计风格

### 商务简约风格
- **主色**: 深蓝 (#1e3a5f)
- **辅助色**: 灰色系 (#f5f5f5, #e0e0e0, #666666)
- **背景**: 白色/浅灰
- **字体**: 无衬线字体，简洁清晰
- **布局**: 大量留白，信息层级分明
- **动画**: 简洁流畅，不过度装饰

### 参考产品
- Teambition（看板交互）
- Notion（极简设计）
- Linear（现代 UI）

---

## 📝 数据库设计

### 核心数据表

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| tasks | 任务表 |
| subtasks | 子任务表 |
| events | 日程表 |
| habits | 习惯表 |
| habit_check_ins | 习惯打卡记录表 |
| categories | 分类表 |
| notifications | 消息通知表 |
| reminder_settings | 提醒设置表 |

完整数据库设计请查看：[个人时间管理App-功能清单.md](./个人时间管理App-功能清单.md#8-数据库设计)

---

## 🔧 API 接口

### 核心接口

#### 用户认证
```
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile
PUT  /api/auth/profile
```

#### 任务管理
```
POST   /api/tasks
GET    /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
PATCH  /api/tasks/:id/status
```

#### 日程管理
```
POST /api/events
GET  /api/events
GET  /api/events/calendar
GET  /api/events/day/:date
```

#### 习惯管理
```
POST   /api/habits
GET    /api/habits
POST   /api/habits/:id/check-in
GET    /api/habits/:id/check-ins
```

完整 API 接口请查看：[个人时间管理App-功能清单.md](./个人时间管理App-功能清单.md#7-api-接口清单)

---

## 🚢 部署建议

### 开发环境
```bash
# 后端
pip install fastapi uvicorn sqlalchemy

# 数据库
sqlite3 planner.db

# 运行
uvicorn main:app --reload
```

### 生产环境
```bash
# 使用 Docker
docker build -t planner-app .
docker run -p 8000:8000 planner-app

# 或使用云服务
- 腾讯云 / 阿里云 / AWS
- 使用 PostgreSQL
- 配置 Redis 缓存
```

---

## 📈 开发计划

### 第一阶段 (MVP)
- [ ] 用户认证
- [ ] 任务 CRUD
- [ ] 任务状态管理
- [ ] 日程 CRUD
- [ ] 日历视图
- [ ] 习惯 CRUD
- [ ] 习惯打卡

### 第二阶段
- [ ] 子任务管理
- [ ] 任务看板视图
- [ ] 重复任务/日程
- [ ] 消息通知
- [ ] 提醒设置

### 第三阶段
- [ ] 统计数据
- [ ] 统计图表
- [ ] 多端同步
- [ ] 离线支持
- [ ] 数据导出

### 第四阶段
- [ ] AI 智能建议
- [ ] 语音输入
- [ ] 手势操作
- [ ] 主题切换
- [ ] 小组件

---

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License

---

## 👨‍💻 作者

- 项目名称: Planner App
- 技术架构: 参考 Rental App (FastAPI + SQLite)
- 设计风格: 商务简约
- 生成时间: 2026-02-14

---

## 📞 联系方式

如有问题或建议，欢迎提 Issue 或 Pull Request。

---

**版本**: v1.0
**最后更新**: 2026-02-14
