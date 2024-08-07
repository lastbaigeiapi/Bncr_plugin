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

/// <reference path="../../@types/Bncr.d.ts" />

class CommonUtils {
  constructor() {
    this.db = new BncrDB('userSystem');
  }

  /**
   * 获取用户数据
   * @param {string} userId 用户ID
   * @returns {Promise<Object>} 用户数据
   */
  async getUserData(userId) {
    let userData = await this.db.get(userId);
    if (!userData) {
      userData = {
        points: 0,
        lastSignIn: null,
        signInStreak: 0,
        totalSignIns: 0
      };
      await this.db.set(userId, userData);
    }
    return userData;
  }

  /**
   * 更新用户数据
   * @param {string} userId 用户ID
   * @param {Object} updateData 要更新的数据
   * @returns {Promise<Object>} 更新后的用户数据
   */
  async updateUserData(userId, updateData) {
    let userData = await this.getUserData(userId);
    userData = { ...userData, ...updateData };
    await this.db.set(userId, userData);
    return userData;
  }

  /**
   * 记录日志
   * @param {string} message 日志信息
   */
  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  /**
   * 错误处理
   * @param {Error} error 错误对象
   */
  handleError(error) {
    console.error('发生错误:', error);
    // 可扩展为记录到日志文件或发送错误通知
  }

  /**
   * 获取今天的日期字符串
   * @returns {string} YYYY-MM-DD 格式的日期
   */
  getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * 获取昨天的日期字符串
   * @returns {string} YYYY-MM-DD 格式的日期
   */
  getYesterdayDate() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
}

module.exports = new CommonUtils();