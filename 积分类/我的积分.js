/**
 * @name PointsSystem
 * @team 啊屁
 * @author 啊屁
 * @description 积分系统插件，查看当前积分、签到情况，支持积分转账
 * @version 3.0.0
 * @rule ^我的积分$
 * @rule ^积分转账 (\d{10}) (\d+)$
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

    async transferPoints(senderKey, receiverKey, points) {
        try {
            // 获取发送者数据
            const senderData = await commonUtils.getUserDataByKey(senderKey);

            // 检查发送者积分是否足够
            if (senderData.points < points) {
                return '❌ 积分不足，无法完成转账。';
            }

            // 获取接收者数据
            const receiverData = await commonUtils.getUserDataByKey(receiverKey);

            // 更新双方的积分
            senderData.points -= points;
            receiverData.points += points;

            // 更新数据库
            await commonUtils.updateUserDataByKey(senderKey, senderData);
            await commonUtils.updateUserDataByKey(receiverKey, receiverData);

            return `✅ 转账成功！你已将 ${points} 积分转给了 ${receiverKey}。`;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 转账时发生了错误，请稍后再试。';
        }
    }
}

module.exports = async (sender) => {
    const msg = sender.getMsg();
    const userId = sender.getUserId();
    const key = await commonUtils.isLoggedIn(userId);

    if (!key) {
        await sender.reply('请先使用有效的key登录');
        return;
    }

    const pointsSystem = new PointsSystem();

    // 判断是查询积分还是积分转账
    if (msg.startsWith('我的积分')) {
        const response = await pointsSystem.getUserInfo(key);
        await sender.reply(response);
    } else if (msg.startsWith('积分转账')) {
        const parts = msg.split(' ');
        const receiverKey = parts[1];
        const points = parseInt(parts[2]);

        // 校验输入的积分值
        if (isNaN(points) || points <= 0) {
            await sender.reply('请输入有效的积分数量。');
            return;
        }

        // 执行积分转账
        const response = await pointsSystem.transferPoints(key, receiverKey, points);
        await sender.reply(response);
    } else {
        await sender.reply('未知指令，请使用 "我的积分" 或 "积分转账 [key] [积分数量]"。');
    }
};
