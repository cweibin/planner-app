# Planner Mobile (uni-app)

本目录为移动端 uni-app 实现，页面结构参考 `frontend/app/planner-mobile-v5.html`，交互逻辑与 Web 端保持一致。

## 目录结构

- `src/pages/home` 今日概况
- `src/pages/tasks` 任务列表
- `src/pages/calendar` 日历月视图
- `src/pages/habits` 习惯追踪
- `src/pages/stats` 统计

## 开发

```bash
cd frontend/mobile
npm install
npm run dev:h5
```

## 说明

- 当前为前端界面与交互样例，数据使用本地 mock。
- 后续可接入后端 `/api` 接口，统一与 Web 端业务逻辑。
