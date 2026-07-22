<template>
  <view class="page">
    <view class="card">
      <text class="title">隐私政策</text>
      <text class="updated">更新日期：2026-07-20</text>

      <text class="h2">一、我们如何收集和使用您的信息</text>
      <text class="p">为完成账号注册、登录及服务提供，本应用会收集以下信息：</text>
      <text class="p">1. <text class="b">手机号</text>：用于账号注册、登录身份识别及账号找回。我们将通过您主动填写的方式获取，不会在您未授权的情况下读取。</text>
      <text class="p">2. <text class="b">邮箱</text>：用于账号注册、登录及必要的服务通知。</text>
      <text class="p">3. <text class="b">密码</text>：仅以加密形式存储，用于身份验证，不会以明文展示。</text>
      <text class="p">4. <text class="b">任务/日程/习惯等内容</text>：由您主动创建，用于在应用内展示、提醒与统计。</text>
      <text class="p">5. <text class="b">录音（语音输入时）</text>：仅在您主动点击"语音输入"并授权麦克风后采集，上传至服务器用于语音转文字及任务解析，处理完成后不长期保留音频原文。</text>
      <text class="p">6. <text class="b">微信登录信息（openid）</text>：当您使用"微信登录"时，我们将通过微信提供的登录能力获取您的微信 openid（微信用户唯一标识）和 unionid（如适用），用于身份识别与账号建立。我们不会通过此方式获取您的微信昵称、头像等个人信息，除非您主动授权提供。</text>

      <text class="h2">二、信息使用目的</text>
      <text class="p">· 提供账号登录与身份识别；</text>
      <text class="p">· 提供任务、日程、习惯管理及统计服务；</text>
      <text class="p">· 提供语音建任务功能（识别您的语音指令）；</text>
      <text class="p">· 通过微信登录建立并识别您的账号；</text>
      <text class="p">· 必要的服务安全与运维。</text>

      <text class="h2">三、信息的存储与保护</text>
      <text class="p">您的信息存储于应用服务器，我们采取合理的安全措施防止信息泄露、丢失或篡改。除法律法规另有规定，不会向第三方共享、出售您的个人信息。</text>

      <text class="h2">四、权限说明</text>
      <text class="p">· 麦克风：仅在您使用语音输入功能并授权后使用，用于录音识别。</text>
      <text class="p">· 微信登录：调用微信登录能力获取 openid，用于身份识别，需您点击"微信登录"并同意后进行。</text>
      <text class="p">· 本应用不会请求与本服务无关的系统权限。</text>

      <text class="h2">五、您的权利</text>
      <text class="p">您有权访问、更正、删除自己的账号及内容信息；如需注销账号或删除个人信息，可联系我们处理。</text>

      <text class="h2">六、未成年人保护</text>
      <text class="p">本应用不面向 14 岁以下未成年人提供独立服务；如发现未成年人未经监护人同意提供个人信息，我们将采取措施删除。</text>

      <text class="h2">七、政策更新</text>
      <text class="p">本政策可能更新，更新后将在本页面公示，继续使用即视为同意。</text>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app';
import { t, initLocale } from '../../locale';

onShow(() => {
  initLocale();
  uni.setNavigationBarTitle({ title: t('nav.privacy') });
});
</script>

<style scoped>
.page { padding: 12px; }
.card { border: 1px solid rgba(110, 95, 116, 0.4); border-radius: 18px; padding: 16px; background: #fff; box-shadow: 0 10px 22px rgba(70, 48, 78, 0.12); display: flex; flex-direction: column; gap: 8px; }
.title { font-size: 18px; font-weight: 700; color: #2b2430; }
.updated { font-size: 12px; color: #776b7f; margin-bottom: 4px; }
.h2 { font-size: 14px; font-weight: 700; color: #2b2430; margin-top: 8px; }
.p { font-size: 13px; color: #2b2430; line-height: 1.6; }
.b { font-weight: 700; }
</style>
