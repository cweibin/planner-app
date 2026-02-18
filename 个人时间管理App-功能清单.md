# 📋 个人时间管理 App 功能清单

> 生成时间：2026-02-14
> 版本：v1.0
> 状态：规划中
> 参考架构：Rental App (FastAPI + SQLite)

---

## 📑 目录

1. [用户管理](#1-用户管理)
2. [任务管理](#2-任务管理)
3. [日程管理](#3-日程管理)
4. [习惯追踪](#4-习惯追踪)
5. [统计数据](#5-统计数据)
6. [消息通知](#6-消息通知)
7. [API 接口清单](#7-api-接口清单)
8. [数据库设计](#8-数据库设计)
9. [核心业务逻辑](#9-核心业务逻辑)
10. [高级功能](#10-高级功能)
11. [部署建议](#11-部署建议)
12. [开发优先级](#12-开发优先级)

---

## 1. 用户管理

### 1.1 用户注册/登录
- [ ] **用户注册**
  - 手机号注册
  - 邮箱注册
  - 第三方登录（微信/Google）
  - 设置密码
- [ ] **用户登录**
  - 手机号/密码登录
  - 手机号/验证码登录
  - 生成登录 Token（JWT）
- [ ] **用户信息**
  - 获取用户基本信息
  - 更新用户信息
  - 修改密码
  - 头像上传

### 1.2 用户设置
- [ ] **偏好设置**
  - 时间格式（12/24小时）
  - 日期格式（年-月-日 / 月-日-年）
  - 时区设置
  - 语言设置（中文/英文）
- [ ] **通知设置**
  - 任务提醒开关
  - 习惯打卡提醒开关
  - 推送通知开关
  - 提醒时间设置

---

## 2. 任务管理

### 2.1 任务 CRUD
- [ ] **添加任务**
  - 任务标题
  - 任务描述
  - 截止日期和时间
  - 优先级（高/中/低）
  - 任务状态（待办/进行中/已完成）
  - 分类/标签（工作/生活/学习等）
  - 子任务
  - 附件（图片/文件）
  - 提醒设置
- [ ] **编辑任务**
  - 修改任务信息
  - 更新截止时间
  - 添加/删除子任务
  - 上传/删除附件
- [ ] **删除任务**
  - 软删除（标记为删除）
  - 硬删除（物理删除）
- [ ] **查看任务列表**
  - 分页查询
  - 按状态筛选（待办/进行中/已完成）
  - 按优先级筛选
  - 按分类筛选
  - 按日期范围筛选
  - 搜索任务标题/描述
- [ ] **查看任务详情**
  - 获取完整任务信息
  - 子任务列表
  - 附件列表
  - 操作历史

### 2.2 任务状态管理
- [ ] **任务状态**
  - 待办（todo）
  - 进行中（in_progress）
  - 已完成（done）
  - 已取消（cancelled）
- [ ] **状态变更**
  - 拖拽任务到不同状态（看板视图）
  - 完成任务
  - 取消任务

### 2.3 子任务
- [ ] **子任务 CRUD**
  - 添加子任务
  - 编辑子任务
  - 删除子任务
  - 标记子任务完成
- [ ] **子任务统计**
  - 已完成/总数
  - 完成进度百分比

---

## 3. 日程管理

### 3.1 日程 CRUD
- [ ] **添加日程**
  - 日程标题
  - 开始时间
  - 结束时间
  - 全天事件开关
  - 日程描述
  - 分类/标签（工作/会议/个人等）
  - 重复设置（每天/每周/每月/自定义）
  - 提醒设置
  - 地点
  - 参与者
- [ ] **编辑日程**
  - 修改日程信息
  - 调整时间
  - 更新重复规则
- [ ] **删除日程**
  - 删除单个日程
  - 删除重复日程（全部/本次/未来）
- [ ] **查看日程列表**
  - 日视图（当天日程）
  - 周视图（本周日程）
  - 月视图（本月日程）
  - 按分类筛选
  - 搜索日程

### 3.2 日历视图
- [ ] **日视图**
  - 时间轴显示
  - 日程卡片
  - 点击查看详情
- [ ] **周视图**
  - 星期一至星期日
  - 日程块显示
  - 拖拽调整时间
- [ ] **月视图**
  - 月份日历
  - 有日程的日期标记
  - 点击查看当天日程

### 3.3 重复日程
- [ ] **重复类型**
  - 每天重复
  - 每周重复（可选择星期几）
  - 每月重复（可选择日期）
  - 每年重复（可选择日期）
  - 自定义重复（Cron 表达式）
- [ ] **重复结束**
  - 无限重复
  - 重复 N 次后结束
  - 指定日期结束

---

## 4. 习惯追踪

### 4.1 习惯 CRUD
- [ ] **添加习惯**
  - 习惯名称
  - 习惯描述
  - 习惯图标
  - 颜色
  - 目标（每天/每周 X 次）
  - 提醒时间
  - 提醒频率（每天/工作日/周末）
- [ ] **编辑习惯**
  - 修改习惯信息
  - 调整提醒时间
- [ ] **删除习惯**
  - 删除习惯
  - 保留打卡记录（可选）
- [ ] **查看习惯列表**
  - 所有习惯
  - 今日习惯
  - 活跃习惯
  - 已暂停习惯

### 4.2 习惯打卡
- [ ] **每日打卡**
  - 点击打卡
  - 取消打卡
  - 打卡时间记录
- [ ] **打卡统计**
  - 连续打卡天数
  - 历史最长连续天数
  - 总打卡天数
  - 完成率

### 4.3 习惯状态管理
- [ ] **习惯状态**
  - 活跃（active）
  - 已暂停（paused）
  - 已完成（completed）
- [ ] **状态变更**
  - 暂停习惯
  - 恢复习惯
  - 标记完成

### 4.4 习惯日历
- [ ] **月度日历**
  - 显示本月打卡情况
  - 已打卡日期标记
  - 未打卡日期标记
  - 漏打卡日期标记

---

## 5. 统计数据

### 5.1 任务统计
- [ ] **任务完成率**
  - 今日完成率
  - 本周完成率
  - 本月完成率
  - 历史完成率
- [ ] **任务分布**
  - 按分类统计（工作/生活/学习）
  - 按优先级统计
  - 按状态统计
- [ ] **任务趋势**
  - 完成任务数量趋势（周/月）
  - 新增任务数量趋势（周/月）

### 5.2 时间统计
- [ ] **时间分布**
  - 每天任务用时统计
  - 分类用时统计
  - 日程用时统计
- [ ] **专注时长**
  - 今日专注时长
  - 本周专注时长
  - 本月专注时长
  - 历史专注时长

### 5.3 习惯统计
- [ ] **习惯完成率**
  - 今日完成率
  - 本周完成率
  - 本月完成率
- [ ] **习惯趋势**
  - 连续打卡趋势
  - 完成率趋势（周/月）

### 5.4 统计图表
- [ ] **图表类型**
  - 柱状图（任务数量、时间分布）
  - 折线图（趋势分析）
  - 饼图（任务分布、时间分布）
  - 热力图（打卡日历）
- [ ] **图表导出**
  - 导出为图片（PNG/JPG）
  - 导出为 PDF

---

## 6. 消息通知

### 6.1 消息类型
- [ ] **系统通知**
  - 任务到期提醒
  - 日程开始提醒
  - 习惯打卡提醒
  - 系统公告

### 6.2 任务提醒
- [ ] **提醒类型**
  - 截止时间提醒（提前 N 分钟/小时/天）
  - 逾期提醒
  - 重复任务提醒

### 6.3 日程提醒
- [ ] **提醒类型**
  - 日程开始提醒（提前 N 分钟/小时/天）
  - 重复日程提醒

### 6.4 习惯提醒
- [ ] **提醒类型**
  - 每日打卡提醒（设置时间）
  - 漏打卡提醒（晚上 22:00）
  - 连续打卡里程碑提醒（7天/30天/100天）

### 6.5 消息推送
- [ ] **站内消息**
  - 消息列表
  - 未读标记
  - 消息已读
  - 消息删除
- [ ] **推送通知**
  - App 推送（iOS/Android）
  - 微信推送（可选）
  - 邮件推送（可选）

---

## 7. API 接口清单

### 7.1 用户认证
```
POST   /api/auth/register          # 用户注册
POST   /api/auth/login             # 用户登录
POST   /api/auth/logout            # 用户登出
POST   /api/auth/refresh           # 刷新Token
GET    /api/auth/profile           # 获取用户信息
PUT    /api/auth/profile           # 更新用户信息
POST   /api/auth/change-password   # 修改密码
PUT    /api/auth/settings          # 更新用户设置
```

### 7.2 任务管理
```
POST   /api/tasks                  # 添加任务
GET    /api/tasks                  # 获取任务列表
GET    /api/tasks/:id              # 获取任务详情
PUT    /api/tasks/:id              # 更新任务信息
DELETE /api/tasks/:id              # 删除任务
PATCH  /api/tasks/:id/status       # 更新任务状态
POST   /api/tasks/:id/complete     # 完成任务
POST   /api/tasks/:id/cancel       # 取消任务
```

### 7.3 子任务管理
```
POST   /api/tasks/:task_id/subtasks        # 添加子任务
GET    /api/tasks/:task_id/subtasks        # 获取子任务列表
PUT    /api/subtasks/:id                   # 更新子任务
DELETE /api/subtasks/:id                   # 删除子任务
PATCH  /api/subtasks/:id/complete          # 完成子任务
```

### 7.4 日程管理
```
POST   /api/events                 # 添加日程
GET    /api/events                 # 获取日程列表
GET    /api/events/:id             # 获取日程详情
PUT    /api/events/:id             # 更新日程信息
DELETE /api/events/:id             # 删除日程
GET    /api/events/calendar        # 获取日历视图数据
GET    /api/events/day/:date       # 获取指定日期日程
GET    /api/events/week/:date      # 获取指定周日程
GET    /api/events/month/:date     # 获取指定月日程
```

### 7.5 习惯管理
```
POST   /api/habits                 # 添加习惯
GET    /api/habits                 # 获取习惯列表
GET    /api/habits/:id             # 获取习惯详情
PUT    /api/habits/:id             # 更新习惯信息
DELETE /api/habits/:id             # 删除习惯
PATCH  /api/habits/:id/status      # 更新习惯状态
POST   /api/habits/:id/check-in    # 习惯打卡
DELETE /api/habits/:id/check-in    # 取消打卡
GET    /api/habits/:id/check-ins   # 获取打卡记录
GET    /api/habits/:id/calendar    # 获取习惯日历
```

### 7.6 统计数据
```
GET    /api/statistics/tasks        # 任务统计
GET    /api/statistics/time         # 时间统计
GET    /api/statistics/habits       # 习惯统计
GET    /api/statistics/overview     # 概览统计
GET    /api/statistics/trends       # 趋势分析
```

### 7.7 消息通知
```
GET    /api/notifications          # 获取消息列表
GET    /api/notifications/unread    # 获取未读消息
POST   /api/notifications/read-all  # 全部标记已读
POST   /api/notifications/:id/read  # 标记已读
DELETE /api/notifications/:id       # 删除消息
```

### 7.8 分类/标签管理
```
GET    /api/categories              # 获取分类列表
POST   /api/categories              # 添加分类
PUT    /api/categories/:id          # 更新分类
DELETE /api/categories/:id          # 删除分类
```

---

## 8. 数据库设计

### 8.1 用户表（users）
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50),
    avatar VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
    language VARCHAR(10) DEFAULT 'zh-CN',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(5) DEFAULT '24h',
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 8.2 任务表（tasks）
```sql
CREATE TABLE tasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status ENUM('todo', 'in_progress', 'done', 'cancelled') DEFAULT 'todo',
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    category_id BIGINT,
    due_date DATETIME,
    remind_before INT,
    is_recurring BOOLEAN DEFAULT 0,
    recurring_rule VARCHAR(100),
    sort_order INT DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### 8.3 子任务表（subtasks）
```sql
CREATE TABLE subtasks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    task_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    is_completed BOOLEAN DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

### 8.4 日程表（events）
```sql
CREATE TABLE events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category_id BIGINT,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    is_all_day BOOLEAN DEFAULT 0,
    location VARCHAR(255),
    is_recurring BOOLEAN DEFAULT 0,
    recurring_rule VARCHAR(100),
    recurring_end_date DATE,
    remind_before INT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### 8.5 习惯表（habits）
```sql
CREATE TABLE habits (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(20),
    color VARCHAR(20),
    target_type ENUM('daily', 'weekly') DEFAULT 'daily',
    target_count INT DEFAULT 1,
    remind_time TIME,
    remind_type ENUM('daily', 'weekdays', 'weekends') DEFAULT 'daily',
    status ENUM('active', 'paused', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 8.6 习惯打卡记录表（habit_check_ins）
```sql
CREATE TABLE habit_check_ins (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    habit_id BIGINT NOT NULL,
    check_in_date DATE NOT NULL,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    UNIQUE KEY uk_habit_date (habit_id, check_in_date)
);
```

### 8.7 分类表（categories）
```sql
CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(20),
    color VARCHAR(20),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 8.8 消息通知表（notifications）
```sql
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type ENUM('task', 'event', 'habit', 'system') NOT NULL,
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    related_id BIGINT,
    related_type VARCHAR(20),
    is_read BOOLEAN DEFAULT 0,
    data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 8.9 提醒设置表（reminder_settings）
```sql
CREATE TABLE reminder_settings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    task_reminder_enabled BOOLEAN DEFAULT 1,
    event_reminder_enabled BOOLEAN DEFAULT 1,
    habit_reminder_enabled BOOLEAN DEFAULT 1,
    push_notification_enabled BOOLEAN DEFAULT 1,
    email_notification_enabled BOOLEAN DEFAULT 0,
    default_task_reminder INT DEFAULT 60,
    default_event_reminder INT DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 9. 核心业务逻辑

### 9.1 任务状态流转
- [ ] **状态流转规则**
  - 待办 → 进行中（开始任务）
  - 进行中 → 已完成（完成任务）
  - 待办/进行中 → 已取消（取消任务）
  - 已完成 → 待办（重新激活任务）
- [ ] **看板视图**
  - 拖拽任务到不同列
  - 自动更新任务状态
  - 实时更新任务数量

### 9.2 重复任务逻辑
- [ ] **任务复制**
  - 根据重复规则自动生成下一个任务
  - 复制任务信息（标题、描述、优先级等）
  - 根据规则计算新的截止时间
- [ ] **重复类型处理**
  - 每天重复：下一天
  - 每周重复：下周同一天
  - 每月重复：下月同一天
  - 自定义：根据 Cron 表达式

### 9.3 重复日程逻辑
- [ ] **日程展开**
  - 根据重复规则展开日程
  - 生成日程实例
  - 支持单次修改和批量修改
- [ ] **日程同步**
  - 修改重复规则时，同步更新所有实例
  - 删除重复日程时，提示删除范围（全部/本次/未来）

### 9.4 习惯打卡逻辑
- [ ] **打卡统计**
  - 连续打卡：计算从最后一次未打卡开始的连续天数
  - 历史最长：查找历史最长连续天数
  - 总打卡数：统计所有打卡记录
- [ ] **漏打卡检测**
  - 每天晚上 22:00 检测未打卡习惯
  - 发送漏打卡提醒
  - 重置连续打卡天数

---

## 10. 高级功能

### 10.1 定时任务
- [ ] **任务提醒**
  - 提前 N 分钟/小时/天提醒
  - 任务逾期提醒
  - 重复任务生成
- [ ] **日程提醒**
  - 提前 N 分钟/小时/天提醒
  - 日程开始提醒
- [ ] **习惯提醒**
  - 每天设置时间提醒
  - 漏打卡提醒（晚上 22:00）
  - 连续打卡里程碑提醒

### 10.2 数据同步
- [ ] **多端同步**
  - 云端存储
  - 本地缓存
  - 冲突解决（最后写入优先）
- [ ] **离线支持**
  - 本地数据存储
  - 离线操作记录
  - 上线后自动同步

### 10.3 数据导出
- [ ] **导出格式**
  - CSV（任务列表）
  - JSON（完整数据）
  - PDF（统计报表）
- [ ] **导出范围**
  - 指定日期范围
  - 指定类型（任务/日程/习惯）
  - 全部数据

### 10.4 数据分析
- [ ] **效率分析**
  - 高效时间段分析
  - 任务完成时间分布
  - 效率评分
- [ ] **习惯分析**
  - 习惯养成曲线
  - 打卡热力图
  - 最佳打卡时间

---

## 11. 部署建议

### 技术栈选择
- **后端框架**：FastAPI / Flask / Express
- **数据库**：SQLite（开发）/ PostgreSQL / MySQL
- **前端框架**：
  - 移动端：Flutter / React Native
  - Web端：React / Vue
  - 跨平台：Electron / Tauri
- **任务调度**：Celery / APScheduler / Bull
- **消息队列**：RabbitMQ / Redis
- **推送服务**：Firebase Cloud Messaging / 个推

### 推荐技术栈
```
后端：FastAPI + SQLAlchemy + SQLite
任务调度：APScheduler
缓存：Redis
前端：Flutter（移动端）+ React（Web端）
```

### 部署架构
```
用户端（Flutter App / Web）
    ↓
API 网关
    ↓
FastAPI 后端服务
    ↓
SQLite / PostgreSQL
    ↓
Redis（缓存 + 任务队列）
```

---

## 12. 开发优先级

### P0（核心功能）
1. [ ] 用户认证（注册、登录）
2. [ ] 任务 CRUD（添加、编辑、删除、查看）
3. [ ] 任务状态管理（待办/进行中/已完成）
4. [ ] 任务列表筛选和搜索
5. [ ] 日程 CRUD（添加、编辑、删除、查看）
6. [ ] 日历视图（日/周/月）
7. [ ] 习惯 CRUD（添加、编辑、删除、查看）
8. [ ] 习惯打卡

### P1（重要功能）
9. [ ] 子任务管理
10. [ ] 任务/日程分类
11. [ ] 任务优先级
12. [ ] 提醒设置（任务/日程/习惯）
13. [ ] 消息通知（站内消息）
14. [ ] 任务看板视图（拖拽）
15. [ ] 重复任务/日程
16. [ ] 习惯打卡统计

### P2（优化功能）
17. [ ] 统计数据（任务/时间/习惯）
18. [ ] 统计图表
19. [ ] 多端同步
20. [ ] 离线支持
21. [ ] 数据导出
22. [ ] 推送通知（App/微信/邮件）
23. [ ] 数据分析（效率/习惯）
24. [ ] 附件上传

### P3（高级功能）
25. [ ] AI 智能建议
26. [ ] 语音输入
27. [ ] 手势操作
28. [ ] 主题切换（深色模式）
29. [ ] 小组件（iOS/Android）
30. [ ] 协作功能（共享任务/日程）

---

## 📝 备注

- 本文档为完整的个人时间管理 App 功能清单
- 参考 Rental App 的技术架构设计
- 所有功能点均已标注
- 包含完整的 API 接口、数据库设计和业务逻辑
- 建议按 P0 → P1 → P2 → P3 的优先级进行开发
- 可根据实际业务需求进行调整

---

**文档版本：v1.0**
**最后更新：2026-02-14**
