/**
 * @name SignInSystem
 * @team 啊屁
 * @author 啊屁
 * @description 签到系统插件，每日签到获取积分，特殊天数有额外奖励
 * @version 2.0.0
 * @rule ^签到$
 * @priority 1000
 * @disable false
 * @public false
 * @admin true
 */

const commonUtils = require('./mod/CommonUtils');
const BASE_POINTS = 10;
const SPECIAL_DAYS = {
    7: 2, 15: 3, 30: 5
};

class SignInSystem {
    async signIn(key) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const userData = await commonUtils.getUserDataByKey(key);

            if (userData.lastSignIn === today) {
                return "你今天已经签到过啦，明天再来吧！😉";
            }

            let points = BASE_POINTS;
            let newStreak = userData.lastSignIn === new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0] 
                ? userData.signInStreak + 1 
                : 1;

            if (SPECIAL_DAYS[newStreak]) {
                points *= SPECIAL_DAYS[newStreak];
            }

            const updateData = {
                points: userData.points + points,
                lastSignIn: today,
                signInStreak: newStreak,
                totalSignIns: userData.totalSignIns + 1
            };

            const updatedUserData = await commonUtils.updateUserDataByKey(key, updateData);

            return `签到成功！当前积分: ${updatedUserData.points}，连续签到: ${newStreak}天。`;
        } catch (error) {
            await commonUtils.handleError(error);
            return '😢 签到时发生了错误，请稍后再试。';
        }
    }
}

module.exports = async (sender) => {
    const userId = sender.getUserId();
    const key = await commonUtils.isLoggedIn(userId);

    if (key) {
        const signInSystem = new SignInSystem();
        const response = await signInSystem.signIn(key);
        await sender.reply(response);
    } else {
        await sender.reply('请先使用有效的key登录');
    }
};
