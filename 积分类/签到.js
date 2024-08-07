/**
 * @author 啊屁
 * @team 啊屁
 * @name SignInSystem
 * @description 签到系统插件，每日签到获取积分，特殊天数有额外奖励
 * @version 2.0.0
 * @rule ^签到$
 * @priority 1000
 * @disable false
 * @public false
 * @admin true
 */

/// <reference path="../../@types/Bncr.d.ts" />

const commonUtils = require('./mod/CommonUtils');

const BASE_POINTS = 10;
const SPECIAL_DAYS = {
  7: 2,   // 7天连续签到，2倍积分
  15: 3,  // 15天连续签到，3倍积分
  30: 5   // 30天连续签到，5倍积分
};

const SIGN_IN_MESSAGES = [
  "太棒了！你今天的签到像阳光一样明媚！☀️",
  "哇哦！你的勤奋程度简直可以感动地球了！🌍",
  "签到成功！你离梦想又近了一步！🚀",
  "棒极了！你的坚持让我们刮目相看！👏",
  "签到完成！你是今天最闪亮的星！⭐",
  "厉害了我的朋友！继续保持这个势头！💪",
  "签到成功！你的努力正在悄悄改变世界！🌈",
  "妙极了！你的签到让这一天变得与众不同！🎉"
];

class SignInSystem {
  async signIn(userId) {
    try {
      const today = commonUtils.getTodayDate();
      const userData = await commonUtils.getUserData(userId);

      if (userData.lastSignIn === today) {
        return "你今天已经签到过啦，明天再来吧！😉";
      }

      let points = BASE_POINTS;
      let multiplier = 1;
      let newStreak = userData.lastSignIn === commonUtils.getYesterdayDate() ? userData.signInStreak + 1 : 1;

      if (SPECIAL_DAYS[newStreak]) {
        multiplier = SPECIAL_DAYS[newStreak];
        points *= multiplier;
      }

      const updateData = {
        points: userData.points + points,
        lastSignIn: today,
        signInStreak: newStreak,
        totalSignIns: userData.totalSignIns + 1
      };

      const updatedUserData = await commonUtils.updateUserData(userId, updateData);

      const message = this.getRandomSignInMessage();
      let response = `${message}\n`;
      response += `🎉 连续签到第 ${newStreak} 天\n`;
      response += `💰 获得 ${points} 积分`;
      if (multiplier > 1) {
        response += ` (${multiplier}倍奖励)`;
      }
      response += `\n🏆 当前总积分: ${updatedUserData.points}`;

      return response;
    } catch (error) {
      commonUtils.handleError(error);
      return '😢 签到时发生了错误，请稍后再试。';
    }
  }

  getRandomSignInMessage() {
    const randomIndex = Math.floor(Math.random() * SIGN_IN_MESSAGES.length);
    return SIGN_IN_MESSAGES[randomIndex];
  }
}

/**
 * @param {Sender} sender
 */
module.exports = async (sender) => {
  const signInSystem = new SignInSystem();
  try {
    const response = await signInSystem.signIn(sender.userId);
    await sender.reply(response);
  } catch (error) {
    commonUtils.handleError(error);
    await sender.reply('😢 签到时发生了错误，请稍后再试。');
  }
};