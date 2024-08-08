/**
 * @name PointsSystem
 * @team 啊屁
 * @author 啊屁
 * @description 积分系统插件，查看当前积分、签到情况
 * @version 2.0.0
 * @rule ^我的积分$
 * @priority 1000
 * @disable false
 * @public false
 * @admin true
 */

const commonUtils = require('./mod/CommonUtils');

class PointsSystem {
    async getUserInfo(key) {
        try {
            const userData = await commonUtils.getUserDataByKey(key);
            const signInDays = userData.lastSignIn 
                ? `上次签到日期: ${userData.lastSignIn}` 
                : '还未签到';

            return `🔍 当前积分: ${userData.points}\n` +
                `📅 签到情况: ${signInDays}\n` +
                `🔢 连续签到: ${userData.signInStreak}天`;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 获取信息时发生了错误，请稍后再试。';
        }
    }
}

module.exports = async (sender) => {
    const userId = sender.getUserId();
    const key = await commonUtils.isLoggedIn(userId);

    if (key) {
        const pointsSystem = new PointsSystem();
        const response = await pointsSystem.getUserInfo(key);
        await sender.reply(response);
    } else {
        await sender.reply('请先使用有效的key登录');
    }
};
