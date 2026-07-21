<template>
  <view class="page">
    <view class="card">
      <text class="title">用户服务协议</text>
      <text class="updated">更新日期：2026-07-20</text>

      <text class="h2">一、服务说明</text>
      <text class="p">本小程序（以下简称"本应用"）由"人生赢家APP"团队提供，是一款个人时间管理工具，包含任务、日程、习惯、统计及语音建任务等功能。使用本应用即表示您同意本协议各项条款。</text>

      <text class="h2">二、账号注册与使用</text>
      <text class="p">1. 您需使用邮箱和/或手机号注册账号并设置密码，账号信息用于登录与身份识别。</text>
      <text class="p">2. 您应保证注册信息真实有效，并对账号及密码安全负责；因账号保管不当造成的损失由您自行承担。</text>
      <text class="p">3. 不得转让、出借账号，不得利用本应用从事违法违规活动。</text>

      <text class="h2">三、用户内容</text>
      <text class="p">您在使用本应用过程中创建的任务、日程、习惯等信息归您所有。本应用仅在您授权范围内存储、展示和处理这些信息，用于提供您所需的服务（如提醒、统计）。</text>

      <text class="h2">四、服务变更与终止</text>
      <text class="p">本应用可能根据运营需要调整、中止或终止部分或全部服务，并将尽量提前通知。如您违反本协议，本应用有权限制或终止您的账号使用。</text>

      <text class="h2">五、免责声明</text>
      <text class="p">本应用提供的服务以"现状"为基础，不对服务的持续性、准确性、及时性作绝对保证。因不可抗力或第三方原因导致的服务中断、数据损失，本应用不承担责任。</text>

      <text class="h2">六、协议更新</text>
      <text class="p">本协议可能更新，更新后将在本页面公示；您继续使用即视为接受修订后的协议。</text>
    </view>
  </view>
</template>

<script setup>
</script>

<style scoped>
.page { padding: 12px; }
.card { border: 1px solid rgba(110, 95, 116, 0.4); border-radius: 18px; padding: 16px; background: #fff; box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12); display: flex; flex-direction: column; gap: 8px; }
.title { font-size: 18px; font-weight: 700; color: #2b2430; }
.updated { font-size: 12px; color: #776b7f; margin-bottom: 4px; }
.h2 { font-size: 14px; font-weight: 700; color: #2b2430; margin-top: 8px; }
.p { font-size: 13px; color: #2b2430; line-height: 1.6; }
</style>
