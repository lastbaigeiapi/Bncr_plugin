/**
 * @name CommonUtils
 * @description 通用函数插件，提供数据库操作和常用工具函数
 * @version 3.0.0
 * @author 啊屁
 * @team 啊屁
 * @priority 1000
 * @disable false
 * @classification ["工具插件"]
 */


// mod/CommonUtils.js
const keyDB = new BncrDB('key_db');
const userDB = new BncrDB('user_db');

// 获取用户 ID 列表
async function getUserIdsByKey(key) {
    const data = await keyDB.get(key, []);
    return Array.isArray(data) ? data : [];
}

// 添加用户 ID 到 Key
async function addUserIdToKey(key, userId) {
    const userIds = await getUserIdsByKey(key);
    if (!userIds.includes(userId)) {
        userIds.push(userId);
        await keyDB.set(key, userIds);
    }
}

// 获取积分等信息
async function getUserDataByKey(key) {
    return await userDB.get(key, { points: 0, signInStreak: 0, lastSignIn: null, totalSignIns: 0 });
}

// 更新积分等信息
async function updateUserDataByKey(key, updateData) {
    const userData = await getUserDataByKey(key);
    const updatedUserData = { ...userData, ...updateData };
    await userDB.set(key, updatedUserData);
    return updatedUserData;
}

// 检查用户是否登录
async function isLoggedIn(userId) {
    const keys = await keyDB.keys();
    for (let key of keys) {
        const userIds = await getUserIdsByKey(key);
        if (userIds.includes(userId)) {
            return key;
        }
    }
    return null;
}

// 错误处理
async function handleError(error) {
    console.error(error);
}

module.exports = {
    getUserIdsByKey,
    addUserIdToKey,
    getUserDataByKey,
    updateUserDataByKey,
    isLoggedIn,
    handleError
};
