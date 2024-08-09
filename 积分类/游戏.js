/**
 * @name CardGameSystem
 * @team 啊屁
 * @author 啊屁
 * @description 积分纸牌游戏系统插件，包括抽卡、三公、炸金花和21点
 * @version 1.7.0
 * @rule ^抽卡|三公|炸金花|21点$
 * @priority 1000
 * @disable false
 * @public false
 * @admin true
 */

const commonUtils = require('./mod/CommonUtils');

// 抽卡游戏的卡牌配置
const CARDS = [
    { name: '普通卡', value: 10 },
    { name: '稀有卡', value: 50 },
    { name: '史诗卡', value: 100 },
    { name: '传奇卡', value: 200 }
];

// 三公游戏的牌值配置
const POKER_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const HAND_VALUE_MAP = {
    '三公': 100,
    '二公': 50,
    '一公': 20,
    '无公': 0
};

// 21点游戏的牌值配置
const CARD_POINTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];  // 1到10，J, Q, K为10点
const BLACKJACK_TARGET = 21;

// 比大小游戏的规则
const DRAW_LOSS = 10; // 平局时扣除积分

class CardGameSystem {
    constructor(sender) {
        this.sender = sender; // 保存 sender 对象
        this.currentBet = 0; // 当前下注金额
        this.timeoutOccurred = false; // 超时标志
    }

    async drawCard(userId, bet) {
        try {
            const userKey = await commonUtils.isLoggedIn(userId);
            if (!userKey) return '请先使用有效的key登录';

            const userData = await commonUtils.getUserDataByKey(userKey);

            // 检查是否已经抽过卡
            if (userData.lastDraw === new Date().toISOString().split('T')[0]) {
                return '你今天已经抽过卡了，请明天再来！';
            }

            if (bet <= 0) return '下注金额必须大于0';

            // 抽取卡牌
            const card = this.getRandomCard();
            const winnings = card.value;

            // 更新积分和抽卡记录
            userData.points += winnings;
            userData.lastDraw = new Date().toISOString().split('T')[0];
            await commonUtils.updateUserDataByKey(userKey, userData);

            return `🎉 你抽到了一张 ${card.name}！\n` +
                `🔮 卡牌价值: ${winnings} 积分\n` +
                `💰 当前积分: ${userData.points}`;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 抽卡时发生了错误，请稍后再试。';
        }
    }

    async playSanGong(userId, bet) {
        try {
            const userKey = await commonUtils.isLoggedIn(userId);
            if (!userKey) return '请先使用有效的key登录';

            const userData = await commonUtils.getUserDataByKey(userKey);
            if (bet <= 0) return '下注金额必须大于0';

            // 记录下注金额
            this.currentBet = bet;

            // 游戏逻辑
            const playerHand = this.drawHand();
            const dealerHand = this.drawHand();
            const playerValue = this.calculateSanGongValue(playerHand);
            const dealerValue = this.calculateSanGongValue(dealerHand);

            let resultMessage = `🃏 你的牌: ${playerHand.join(', ')}\n` +
                `🃏 对手的牌: ${dealerHand.join(', ')}\n`;

            // 询问是否做庄
            const isDealer = await this.askForDealer();

            if (this.timeoutOccurred) {
                return '⏳ 游戏超时，操作已取消。';
            }

            if (playerValue === dealerValue) {
                if (isDealer) {
                    userData.points += this.currentBet;
                    await commonUtils.updateUserDataByKey(userKey, userData);
                    resultMessage += `🤝 平局！作为庄家，你赢得了 ${this.currentBet} 积分\n` +
                        `💰 当前积分: ${userData.points}\n` +
                        `🏆 平局，庄家赢得额外积分。`;
                } else {
                    userData.points -= DRAW_LOSS;
                    await commonUtils.updateUserDataByKey(userKey, userData);
                    resultMessage += `🤝 平局！你没有选择做庄，扣除 ${DRAW_LOSS} 积分\n` +
                        `💰 当前积分: ${userData.points}\n` +
                        `⚖️ 平局，积分因未坐庄而减少。`;
                }
            } else if (playerValue > dealerValue) {
                userData.points += this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `🎉 胜利！你赢得了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `🥇 你赢得了比赛，因为你的牌值更高。`;
            } else {
                userData.points -= this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `😢 失败！你失去了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `💔 对手的牌值更高，你输了。`;
            }

            return resultMessage;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 三公游戏时发生了错误，请稍后再试。';
        }
    }

    async playZhaJinHua(userId, bet) {
        try {
            const userKey = await commonUtils.isLoggedIn(userId);
            if (!userKey) return '请先使用有效的key登录';

            const userData = await commonUtils.getUserDataByKey(userKey);
            if (bet <= 0) return '下注金额必须大于0';

            // 记录下注金额
            this.currentBet = bet;

            // 游戏逻辑
            const playerHand = this.drawHand();
            const dealerHand = this.drawHand();
            const playerValue = this.calculateZhaJinHuaValue(playerHand);
            const dealerValue = this.calculateZhaJinHuaValue(dealerHand);

            let resultMessage = `🃏 你的牌: ${playerHand.join(', ')}\n` +
                `🃏 对手的牌: ${dealerHand.join(', ')}\n`;

            // 询问是否做庄
            const isDealer = await this.askForDealer();

            if (this.timeoutOccurred) {
                return '⏳ 游戏超时，操作已取消。';
            }

            if (playerValue > dealerValue) {
                userData.points += this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `🎉 胜利！你赢得了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `🥇 你赢了，因为你的牌更高。`;
            } else if (playerValue < dealerValue) {
                userData.points -= this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `😢 失败！你失去了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `💔 对手的牌值更高，你输了。`;
            } else {
                if (isDealer) {
                    userData.points += this.currentBet;
                    await commonUtils.updateUserDataByKey(userKey, userData);
                    resultMessage += `🤝 平局！作为庄家，你赢得了 ${this.currentBet} 积分\n` +
                        `💰 当前积分: ${userData.points}\n` +
                        `⚖️ 平局，庄家获得额外积分。`;
                } else {
                    userData.points -= DRAW_LOSS;
                    await commonUtils.updateUserDataByKey(userKey, userData);
                    resultMessage += `🤝 平局！你没有选择做庄，扣除 ${DRAW_LOSS} 积分\n` +
                        `💰 当前积分: ${userData.points}\n` +
                        `⚖️ 平局，积分因未坐庄而减少。`;
                }
            }

            return resultMessage;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 炸金花游戏时发生了错误，请稍后再试。';
        }
    }

    async play21Points(userId, bet) {
        try {
            const userKey = await commonUtils.isLoggedIn(userId);
            if (!userKey) return '请先使用有效的key登录';

            const userData = await commonUtils.getUserDataByKey(userKey);
            if (bet <= 0) return '下注金额必须大于0';

            // 记录下注金额
            this.currentBet = bet;

            // 游戏逻辑
            const playerHand = [this.drawCardValue(), this.drawCardValue()];
            const dealerHand = [this.drawCardValue(), this.drawCardValue()];
            let playerScore = this.calculateBlackjackScore(playerHand);
            let dealerScore = this.calculateBlackjackScore(dealerHand);

            let resultMessage = `🃏 你的牌: ${playerHand.join(', ')}\n` +
                `🃏 对手的牌: ${dealerHand.join(', ')}\n`;

            // 询问是否做庄
            const isDealer = await this.askForDealer();

            if (this.timeoutOccurred) {
                return '⏳ 游戏超时，操作已取消。';
            }

            if (playerScore > BLACKJACK_TARGET) {
                userData.points -= this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `😢 你爆点了，失败！你失去了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `💔 你的得分超过了 ${BLACKJACK_TARGET}，因此爆点失败。`;
            } else if (dealerScore > BLACKJACK_TARGET || playerScore > dealerScore) {
                userData.points += this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `🎉 胜利！你赢得了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `🥇 你获胜了，因为你的得分更高，或对手爆点。`;
            } else if (playerScore < dealerScore) {
                userData.points -= this.currentBet;
                await commonUtils.updateUserDataByKey(userKey, userData);
                resultMessage += `😢 失败！你失去了 ${this.currentBet} 积分\n` +
                    `💰 当前积分: ${userData.points}\n` +
                    `💔 对手的得分更高，你输了。`;
            } else {
                if (isDealer) {
                    userData.points += this.currentBet;
                    await commonUtils.updateUserDataByKey(userKey, userData);
                    resultMessage += `🤝 平局！作为庄家，你赢得了 ${this.currentBet} 积分\n` +
                        `💰 当前积分: ${userData.points}\n` +
                        `⚖️ 平局，庄家获得额外积分。`;
                } else {
                    userData.points -= DRAW_LOSS;
                    await commonUtils.updateUserDataByKey(userKey, userData);
                    resultMessage += `🤝 平局！你没有选择做庄，扣除 ${DRAW_LOSS} 积分\n` +
                        `💰 当前积分: ${userData.points}\n` +
                        `⚖️ 平局，积分因未坐庄而减少。`;
                }
            }

            return resultMessage;
        } catch (error) {
            commonUtils.handleError(error);
            return '😢 21点游戏时发生了错误，请稍后再试。';
        }
    }

    getRandomCard() {
        const randomIndex = Math.floor(Math.random() * CARDS.length);
        return CARDS[randomIndex];
    }

    drawHand() {
        const hand = [];
        for (let i = 0; i < 3; i++) {
            hand.push(Math.floor(Math.random() * POKER_VALUES.length) + 1);
        }
        return hand;
    }

    drawCardValue() {
        const randomIndex = Math.floor(Math.random() * CARD_POINTS.length);
        return CARD_POINTS[randomIndex];
    }

    calculateSanGongValue(hand) {
        const valueCounts = {};
        hand.forEach(card => {
            valueCounts[card] = (valueCounts[card] || 0) + 1;
        });
        if (Object.values(valueCounts).some(count => count === 3)) {
            return HAND_VALUE_MAP['三公'];
        } else if (Object.values(valueCounts).some(count => count === 2)) {
            return HAND_VALUE_MAP['二公'];
        } else if (Object.values(valueCounts).some(count => count === 1)) {
            return HAND_VALUE_MAP['一公'];
        } else {
            return HAND_VALUE_MAP['无公'];
        }
    }

    calculateZhaJinHuaValue(hand) {
        return Math.max(...hand);
    }

    calculateBlackjackScore(hand) {
        const sum = hand.reduce((acc, card) => acc + card, 0);
        return sum > BLACKJACK_TARGET ? sum - 10 : sum;
    }

    async askForDealer() {
        await this.sender.reply('是否做庄？回复 “是” 作为庄家，或回复 “否” 不作为庄家。');

        let newMsg = await this.sender.waitInput((s) => {
            const response = s.getMsg().trim().toLowerCase();
            if (response === '是' || response === '否') {
                return response;
            } else {
                s.reply('请回复 “是” 或 “否”');
                return 'again';
            }
        }, 30);

        if (newMsg === null) {
            this.timeoutOccurred = true; // 设置超时标志
            return null;
        }

        const response = newMsg.getMsg().trim().toLowerCase();
        return response === '是';
    }
}

/**
 * @param {Sender} sender
 */
module.exports = async (sender) => {
    const userId = sender.getUserId();
    const msg = sender.getMsg();
    const [command, bet] = msg.split(' ');

    try {
        const cardGameSystem = new CardGameSystem(sender);
        if (command === '抽卡') {
            if (!bet || isNaN(bet) || parseInt(bet) <= 0) {
                await sender.reply('请提供有效的下注积分');
                return;
            }
            const response = await cardGameSystem.drawCard(userId, parseInt(bet));
            await sender.reply(response);
        } else if (command === '三公') {
            if (!bet || isNaN(bet) || parseInt(bet) <= 0) {
                await sender.reply('请提供有效的下注积分');
                return;
            }
            const response = await cardGameSystem.playSanGong(userId, parseInt(bet));
            await sender.reply(response);
        } else if (command === '炸金花') {
            if (!bet || isNaN(bet) || parseInt(bet) <= 0) {
                await sender.reply('请提供有效的下注积分');
                return;
            }
            const response = await cardGameSystem.playZhaJinHua(userId, parseInt(bet));
            await sender.reply(response);
        } else if (command === '21点') {
            if (!bet || isNaN(bet) || parseInt(bet) <= 0) {
                await sender.reply('请提供有效的下注积分');
                return;
            }
            const response = await cardGameSystem.play21Points(userId, parseInt(bet));
            await sender.reply(response);
        } else {
            await sender.reply('无效的命令，请使用 “抽卡”、“三公”、“炸金花” 或 “21点”');
        }
    } catch (error) {
        commonUtils.handleError(error);
        await sender.reply('😢 发生了错误，请稍后再试。');
    }
};
