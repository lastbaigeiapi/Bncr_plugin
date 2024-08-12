/**
 * @name PointsSystem
 * @team 啊屁
 * @author 啊屁
 * @description 积分系统插件，查看当前积分、签到情况，支持积分存款和提取
 * @version 1.0.0-fix
 * @rule ^我的积分$
 * @rule ^存款 (\d+)$
 * @rule ^查看存款$
 * @rule ^提取存款$
 * @priority 1000
 * @disable false
 * @public false
 * @admin false
 */

const commonUtils = require('./mod/CommonUtils');

class PointsSystem {
    // 获取当前标准化的时间
    getCurrentDateTime() {
        return new Date().toLocaleString(); // 使用本地时间字符串
    }

    async getUserInfo(key) {
        try {
            const userData = await commonUtils.getUserDataByKey(key);
            const signInDays = userData.lastSignIn 
                ? `上次签到日期: ${new Date(userData.lastSignIn).toLocaleDateString()}` 
                : '还未签到';

            // 限制积分显示的精度，最多保留两位小数
            const points = userData.points.toFixed(2);

            // 计算当前的投资笔数
            const investmentCount = userData.investments ? userData.investments.length : 0;

            let response = `🔍 当前积分: ${points}\n` +
                `📅 签到情况: ${signInDays}\n` +
                `🔢 连续签到: ${userData.signInStreak}天\n` +
                `📈 当前投资: ${investmentCount} 笔`;

            if (userData.deposits && userData.deposits.length > 0) {
                // 存款利率
                const depositRate = 0.002; // 例子中的固定利率

                response += `\n💰 你有 ${userData.deposits.length} 笔存款记录：\n`;

                userData.deposits.forEach((deposit, index) => {
                    response += `${index + 1}. 存款金额: ${deposit.points.toFixed(2)} 积分\n`;
                });

                response += `\n当前存款利率: ${(depositRate * 100).toFixed(2)}% 年利率`;
                response += `\n输入 "查看存款" 查看详情。`;
            }

            return response;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 获取信息时发生了错误，请稍后再试。';
        }
    }

    async depositPoints(sender, points) {
        const userId = sender.getUserId();
        const key = await commonUtils.isLoggedIn(userId);

        if (!key) {
            await sender.reply('请先使用有效的key登录');
            return;
        }

        try {
            const userData = await commonUtils.getUserDataByKey(key);

            // 存款逻辑
            if (userData.points < points) {
                await sender.reply('❌ 积分不足，无法完成存款。');
                return;
            }

            const deposit = {
                points,
                date: new Date().toISOString(), // ISO 格式时间戳
            };

            if (!userData.deposits) {
                userData.deposits = [];
            }

            userData.deposits.push(deposit);
            userData.points -= points; // 扣除积分

            await commonUtils.updateUserDataByKey(key, userData);

            await sender.reply(`✅ 已成功存入 ${points} 积分至存款账户。\n存款时间: ${this.getCurrentDateTime()}`);
        } catch (error) {
            await sender.reply(`存款时发生错误: ${error.message}`);
        }
    }

    async viewDeposits(sender) {
        const userId = sender.getUserId();
        const key = await commonUtils.isLoggedIn(userId);

        if (!key) {
            await sender.reply('请先使用有效的key登录');
            return;
        }

        const userData = await commonUtils.getUserDataByKey(key);

        if (!userData.deposits || userData.deposits.length === 0) {
            await sender.reply('你当前没有存款。');
            return;
        }

        let replyMessage = '**你的存款情况**\n';

        for (let [index, deposit] of userData.deposits.entries()) {
            replyMessage += `
${index + 1}. 存款积分: ${deposit.points}
   存款时间: ${new Date(deposit.date).toLocaleString()}
            `;
        }

        await sender.reply(replyMessage);
    }

    async withdrawDeposits(sender) {
        const userId = sender.getUserId();
        const key = await commonUtils.isLoggedIn(userId);

        if (!key) {
            await sender.reply('请先使用有效的key登录');
            return;
        }

        try {
            const userData = await commonUtils.getUserDataByKey(key);

            if (!userData.deposits || userData.deposits.length === 0) {
                await sender.reply('你当前没有存款可以提取。');
                return;
            }

            // 显示当前存款情况
            let depositInfo = '当前存款情况：\n';
            userData.deposits.forEach((deposit, index) => {
                depositInfo += `${index + 1}. 存款积分: ${deposit.points} (存入时间: ${new Date(deposit.date).toLocaleString()})\n`;
            });
            await sender.reply(depositInfo + '\n请选择要提取的存款编号，或输入"全部"提取所有存款：');

            const choice = await sender.waitInput(async (s) => {
                const msg = s.getMsg().trim().toLowerCase();
                if (msg === '全部' || (parseInt(msg) > 0 && parseInt(msg) <= userData.deposits.length)) {
                    return msg;
                } else {
                    await s.reply('❌ 无效选择，请重新输入。');
                    return 'again';
                }
            }, 30);

            if (choice === null) {
                await sender.reply('超时退出提取操作。');
                return;
            }

            let withdrawnAmount = 0;
            let interest = 0;

            if (choice === '全部') {
                withdrawnAmount = userData.deposits.reduce((sum, deposit) => sum + (deposit.points || 0), 0);
                interest = this.calculateInterest(userData.deposits);
                userData.deposits = [];
            } else {
                const index = parseInt(choice) - 1;
                const deposit = userData.deposits[index];
                if (!deposit || typeof deposit.points === 'undefined') {
                    console.error('Invalid deposit object:', deposit);
                    await sender.reply('提取存款时发生错误：无效的存款数据');
                    return;
                }
                withdrawnAmount = deposit.points;
                interest = this.calculateInterest([deposit]);
                userData.deposits.splice(index, 1);
            }

            // 更新用户积分
            userData.points += withdrawnAmount + interest;

            // 更新用户数据
            await commonUtils.updateUserDataByKey(key, userData);

            await sender.reply(`✅ 提取成功！\n提取金额: ${withdrawnAmount}\n利息: ${interest.toFixed(2)}\n总计: ${(withdrawnAmount + interest).toFixed(2)}\n时间: ${this.getCurrentDateTime()}`);
        } catch (error) {
            console.error('Error in withdrawDeposits:', error);
            await sender.reply(`提取存款时发生错误: ${error.message}`);
        }
    }

    calculateInterest(deposits) {
        const now = new Date();
        let totalInterest = 0;
        for (let deposit of deposits) {
            const depositDate = new Date(deposit.date);
            // 从存款第二天开始计算利息
            const days = (now - depositDate) / (1000 * 60 * 60 * 24) - 1;
            const rate = 0.002; // 假设统一利率
            if (days > 0) {
                totalInterest += deposit.points * rate * (days / 365);
            }
        }
        return Math.round(totalInterest * 100) / 100; // 保留两位小数
    }
}

module.exports = async (sender) => {
    const msg = sender.getMsg().trim();
    const parts = msg.split(' ');

    const pointsSystem = new PointsSystem();

    if (msg === '我的积分') {
        const userId = sender.getUserId();
        const key = await commonUtils.isLoggedIn(userId);

        if (key) {
            const response = await pointsSystem.getUserInfo(key);
            await sender.reply(response);
        } else {
            await sender.reply('请先使用有效的key登录');
        }
    } else if (msg.startsWith('存款')) {
        const points = parseInt(parts[1]);

        if (isNaN(points) || points <= 0) {
            await sender.reply('请输入有效的积分数量。');
            return;
        }

        // 执行存款操作
        await pointsSystem.depositPoints(sender, points);
    } else if (msg === '查看存款') {
        await pointsSystem.viewDeposits(sender);
    } else if (msg === '提取存款') {
        await pointsSystem.withdrawDeposits(sender);
    } else {
        await sender.reply('未知指令，请使用 "我的积分"，"存款 [积分数量]"，"查看存款" 或 "提取存款"。');
    }
};
