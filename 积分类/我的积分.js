/**
 * @author 啊屁
 * @team 啊屁
 * @name PointsSystem
 * @description 积分系统插件，查看当前积分、签到情况
 * @version 2.0.0
 * @rule ^我的积分$
 * @priority 1000
 * @disable false
 * @public false
 * @admin true
 */

/// <reference path="../../@types/Bncr.d.ts" />

const commonUtils = require('./mod/CommonUtils');

const QUOTES = [
  "努力是成功的秘诀。 🌟",
  "每一次进步，都是向成功迈进。 🚀",
  "坚持就是胜利！ 💪",
  "每一个成功的背后，都有无数个不为人知的努力。 🏆",
  "相信自己，你就是最棒的！ 🌈",
];

class PointsSystem {
  /**
   * 获取用户积分和签到信息
   * @param {string} userId - 用户ID
   * @returns {Promise<string>} - 返回用户积分和签到信息
   */
  async getUserInfo(userId) {
    try {
      const userData = await commonUtils.getUserData(userId);
      const signInDays = userData.lastSignIn 
        ? `上次签到日期: ${userData.lastSignIn}` 
        : '还未签到';

      const quote = this.getRandomQuote();

      return `🔍 **当前积分**: ${userData.points}\n` +
             `📅 **签到情况**: ${signInDays}\n` +
             `🔢 **连续签到**: ${userData.signInStreak}天\n` +
             `✨ **格言**: ${quote}`;
    } catch (error) {
      commonUtils.handleError(error);
      return '😢 获取信息时发生了错误，请稍后再试。';
    }
  }

  /**
   * 随机选择一句格言
   * @returns {string} - 随机格言
   */
  getRandomQuote() {
    const randomIndex = Math.floor(Math.random() * QUOTES.length);
    return QUOTES[randomIndex];
  }
}

/**
 * @param {Sender} sender
 */
module.exports = async (sender) => {
  const pointsSystem = new PointsSystem();
  try {
    const response = await pointsSystem.getUserInfo(sender.userId);
    await sender.reply(response);
  } catch (error) {
    commonUtils.handleError(error);
    await sender.reply('😢 获取信息时发生了错误，请稍后再试。');
  }
};