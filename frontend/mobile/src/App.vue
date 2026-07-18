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
page {
  background: #f7f1f5;
  color: #2b2430;
  font-family: "Plus Jakarta Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}



.card {
  background: #fff;
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12);
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  margin: 0 0 12px;
}

.btn {
  border: 1px solid rgba(110, 95, 116, 0.4);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 600;
  background: #fff;
  color: #2b2430;
}

.btn.primary {
  background: #b76e8a;
  border-color: #b76e8a;
  color: #fff;
}

.chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(110, 95, 116, 0.4);
  background: #fff;
  color: #776b7f;
}

.chip.active {
  background: #b76e8a;
  border-color: #b76e8a;
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
