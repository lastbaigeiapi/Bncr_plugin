/**
 * @name LoginSystem
 * @team 啊屁
 * @author 啊屁
 * @description 登录系统插件,通过唯一10位数key绑定用户账号
 * @version 5.0.0
 * @rule ^生成key$
 * @rule ^key (\d{10})?$
 * @priority 900
 * @disable false
 * @public false
 * @admin true
 */

const commonUtils = require('./mod/CommonUtils');

module.exports = async (sender) => {
    const msg = sender.getMsg();
    const parts = msg.split(' ');
    const command = parts[0];
    const userId = sender.getUserId();

    if (command === '生成key') {
        const newKey = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');

        // 添加用户ID到新的key
        await commonUtils.addUserIdToKey(newKey, userId);
        await sender.reply(`你的新key是: ${newKey}`);

    } else if (command === 'key' && parts.length === 2) {
        const inputKey = parts[1];
        const userIds = await commonUtils.getUserIdsByKey(inputKey);

        if (userIds.includes(userId)) {
            await sender.reply('你已使用此key登录。');
        } else if (userIds.length > 0) {
            // 添加新的userId到key
            await commonUtils.addUserIdToKey(inputKey, userId);
            await sender.reply(`Key验证成功，欢迎使用此key的另一个用户: ${userId}`);
        } else {
            await sender.reply('无效的key，请重新输入或生成新的key');
        }
    } else {
        await sender.reply('请输入 key 或 生成key');
    }
};
