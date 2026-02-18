<template>
  <view>
    <!-- 页面内容由uni-app根据pages.json自动渲染 -->
  </view>
</template>

<script>
export default {
  onLaunch() {
    console.log('App Launch');
  },
  onShow() {
    console.log('App Show');
  },
  onHide() {
    console.log('App Hide');
  },
};
</script>

<style>
:root {
  --bg: #f7f1f5;
  --surface: #fffdfd;
  --text: #2b2430;
  --muted: #776b7f;
  --accent: #b76e8a;
  --accent-2: #7b8db8;
  --success: #4e9f86;
  --line: rgba(110, 95, 116, 0.4);
  --radius: 18px;
  --shadow: 0 10px 22px rgba(70, 48, 78, 0.12);
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 20px;
  --font-title: 22px;
  --font-subtitle: 16px;
  --font-body: 14px;
  --font-small: 12px;
}

page {
  background: var(--bg);
  color: var(--text);
  font-family: "Plus Jakarta Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}



.card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow);
}

.section-title {
  font-size: var(--font-body);
  font-weight: 700;
  margin: 0 0 var(--spacing-md);
}

.btn {
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: var(--font-body);
  font-weight: 600;
  background: #fff;
  color: var(--text);
}

.btn.primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--font-small);
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
}

.chip.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.uni-tabbar__item {
  font-weight: 700;
}

.uni-tabbar__item .uni-tabbar__text {
  font-size: 15px;
  font-weight: 700;
}
</style>
