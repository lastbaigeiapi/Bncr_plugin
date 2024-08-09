/**
 * @name LoginSystem
 * @team 啊屁
 * @author 啊屁
 * @description 登录系统插件,通过唯一10位数key绑定用户账号
 * @version 5.0.0
 * @rule ^(生成key|查看key)$
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
        // 获取用户当前的key
        const currentKey = await commonUtils.isLoggedIn(userId);
        
        let userData = null;

        // 如果用户已有key，迁移数据并移除旧key
        if (currentKey) {
            userData = await commonUtils.getUserDataByKey(currentKey);
            await commonUtils.removeKey(currentKey);
            await commonUtils.removeUserDataByKey(currentKey);
        }

        // 生成新的key
        const newKey = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');

        // 添加用户ID到新的key
        await commonUtils.addUserIdToKey(newKey, userId);

        // 如果有旧数据，将其迁移到新key
        if (userData) {
            await commonUtils.updateUserDataByKey(newKey, userData);
        }

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

    } else if (command === '查看key') {
        // 查看当前用户的key
        const currentKey = await commonUtils.isLoggedIn(userId);
        if (currentKey) {
            await sender.reply(`你当前绑定的key是: ${currentKey}`);
        } else {
            await sender.reply('你当前没有绑定任何key。');
        }

    } else {
        await sender.reply('请输入 "生成key", "key [你的key]" 或 "查看key"。');
    }
};
