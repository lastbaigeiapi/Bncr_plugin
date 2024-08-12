/**
 * @name CryptoInvestment
 * @team 啊屁
 * @author 啊屁
 * @description 虚拟币投资系统插件，允许用户使用积分进行虚拟币投资、查看收益和卖出虚拟币。
 * @version 1.0.1
 * @rule ^投资 (\w+) (\d+)$
 * @rule ^我的投资$
 * @rule ^可购买币种$
 * @rule ^卖出 (\w+) (\d+)$
 * @priority 1000
 * @disable false
 * @public false
 * @admin true
 */

const axios = require('axios');
const commonUtils = require('./mod/CommonUtils');

class CryptoInvestment {
    // 获取虚拟币实时价格
    async getPrice(symbol) {
        try {
            const apiUrl = `https://api.huobi.pro/market/detail/merged?symbol=${symbol}`;
            const { data } = await axios.get(apiUrl);

            if (data.status !== 'ok' || !data.tick || !data.tick.bid) {
                throw new Error('无法获取价格数据');
            }

            return parseFloat(data.tick.bid[0]);
        } catch (error) {
            commonUtils.handleError(error);
            throw new Error(`获取 ${symbol} 实时价格时出错。请稍后再试。`);
        }
    }

    // 获取当前标准化的时间
    getCurrentDateTime() {
        return new Date().toLocaleString();
    }

    // 处理投资请求
    async invest(sender, currency, amount) {
    const userId = sender.getUserId();
    const key = await commonUtils.isLoggedIn(userId);

    if (!key) {
        await sender.reply(`请先使用有效的key登录\n时间: ${this.getCurrentDateTime()}`);
        return;
    }

    const userData = await commonUtils.getUserDataByKey(key);

    if (!userData.investments) {
        userData.investments = [];
    }

    try {
        const usdtPrice = await this.getPrice(`${currency.toLowerCase()}usdt`);
        const requiredUsdt = amount * usdtPrice;

        const availableUsdt = userData.points * 10;

        if (availableUsdt < requiredUsdt) {
            await sender.reply(`❌ 积分不足，无法完成投资。\n时间: ${this.getCurrentDateTime()}`);
            return;
        }

        const pointsToDeduct = requiredUsdt / 10;
        userData.points -= pointsToDeduct;

        let investment = userData.investments.find(inv => inv.currency.toLowerCase() === currency.toLowerCase());

        if (investment) {
            const totalInvested = investment.amountInvested * investment.averagePrice;
            investment.amountInvested += amount;
            investment.totalInvested = totalInvested + requiredUsdt;
            investment.averagePrice = investment.totalInvested / investment.amountInvested;
            investment.priceHistory.push({ price: usdtPrice, amount, date: this.getCurrentDateTime() });
        } else {
            userData.investments.push({
                currency: currency.toUpperCase(),
                points: pointsToDeduct,
                amountInvested: amount,
                investedUsdt: requiredUsdt,
                averagePrice: usdtPrice,
                totalInvested: requiredUsdt,
                priceHistory: [{ price: usdtPrice, amount, date: this.getCurrentDateTime() }],
                date: this.getCurrentDateTime()
            });
        }

        await commonUtils.updateUserDataByKey(key, userData);

        await sender.reply(`✅ 成功投资 ${amount} ${currency.toUpperCase()}。\n时间: ${this.getCurrentDateTime()}`);
    } catch (error) {
        await sender.reply(`投资时发生错误: ${error.message}\n时间: ${this.getCurrentDateTime()}`);
    }
}


    // 查看投资和收益情况
    async viewInvestments(sender) {
    const userId = sender.getUserId();
    const key = await commonUtils.isLoggedIn(userId);

    if (!key) {
        await sender.reply('请先使用有效的key登录');
        return;
    }

    const userData = await commonUtils.getUserDataByKey(key);

    if (!userData.investments || userData.investments.length === 0) {
        await sender.reply('你当前没有进行中的投资。');
        return;
    }

    let replyMessage = '**你的投资情况与收益**\n';

    for (let investment of userData.investments) {
        try {
            const currentPrice = await this.getPrice(`${investment.currency.toLowerCase()}usdt`);
            const currentUsdtValue = investment.amountInvested * currentPrice;
            const profitOrLoss = currentUsdtValue - investment.totalInvested;
            const profitOrLossPercentage = (profitOrLoss / investment.totalInvested) * 100;

            replyMessage += `
- 币种: ${investment.currency.toUpperCase()}
- 投资积分: ${investment.points.toFixed(2)}
- 投资数量: ${investment.amountInvested} ${investment.currency.toUpperCase()}
- 买入均价: ${investment.averagePrice.toFixed(6)} USDT
- 当前价格: ${currentPrice.toFixed(6)} USDT
- 当前价值: ${currentUsdtValue.toFixed(6)} USDT
- 收益: ${profitOrLoss.toFixed(6)} USDT (${profitOrLossPercentage.toFixed(2)}%)
- 投资时间: ${investment.date}
            `;
        } catch (error) {
            replyMessage += `
- 币种: ${investment.currency.toUpperCase()}
- 投资积分: ${investment.points.toFixed(2)}
- 投资数量: ${investment.amountInvested} ${investment.currency.toUpperCase()}
- 买入均价: ${investment.averagePrice.toFixed(6)} USDT
- 当前价格: 无法获取
- 当前价值: 无法获取
- 投资时间: ${investment.date}
            `;
        }
    }

    await sender.reply(replyMessage);
}

    // 查看可购买币种及其数量
    async viewPurchasableCurrencies(sender) {
        const userId = sender.getUserId();
        const key = await commonUtils.isLoggedIn(userId);

        if (!key) {
            await sender.reply('请先使用有效的key登录');
            return;
        }

        const userData = await commonUtils.getUserDataByKey(key);

        if (userData.points <= 0) {
            await sender.reply('你当前没有足够的积分进行购买。');
            return;
        }

        const currencies = ['btc', 'eth', 'bnb', 'ton', 'doge']; // 可购买的币种列表
        let replyMessage = '**你可以购买的币种数量**\n';
        const availableUsdt = userData.points * 10; // 当前积分对应的USDT数量

        for (let currency of currencies) {
            try {
                const usdtPrice = await this.getPrice(`${currency}usdt`);
                const purchasableAmount = Math.floor(availableUsdt / usdtPrice); // 向下取整为整数

                replyMessage += `
- 币种: ${currency.toUpperCase()}
- 当前价格: ${usdtPrice.toFixed(6)} USDT
- 可购买数量: ${purchasableAmount} ${currency.toUpperCase()}
                `;
            } catch (error) {
                replyMessage += `
- 币种: ${currency.toUpperCase()}
- 当前价格: 无法获取
- 可购买数量: 无法计算
                `;
            }
        }

        await sender.reply(replyMessage);
    }

    // 卖出功能
async sell(sender, currency, amount) {
    const userId = sender.getUserId();
    const key = await commonUtils.isLoggedIn(userId);

    if (!key) {
        await sender.reply('请先使用有效的key登录');
        return;
    }

    const userData = await commonUtils.getUserDataByKey(key);

    const investmentIndex = userData.investments.findIndex(inv => inv.currency.toLowerCase() === currency.toLowerCase());

    if (investmentIndex === -1) {
        await sender.reply(`你没有${currency.toUpperCase()}的投资记录。`);
        return;
    }

    const investment = userData.investments[investmentIndex];

    if (amount > investment.amountInvested) {
        await sender.reply(`你没有足够的${currency.toUpperCase()}可卖出。`);
        return;
    }

    try {
        const currentPrice = await this.getPrice(`${currency.toLowerCase()}usdt`);
        const sellUsdtValue = amount * currentPrice;
        const cost = amount * investment.averagePrice;
        const profitOrLoss = sellUsdtValue - cost;

        const pointsGained = sellUsdtValue / 10;
        userData.points += pointsGained;

        if (amount === investment.amountInvested) {
            userData.investments.splice(investmentIndex, 1);
        } else {
            investment.amountInvested -= amount;
            investment.totalInvested = investment.amountInvested * investment.averagePrice;
        }

        await commonUtils.updateUserDataByKey(key, userData);

        await sender.reply(`✅ 卖出成功！\n卖出数量: ${amount} ${currency.toUpperCase()}\n卖出价格: ${currentPrice.toFixed(6)} USDT\n卖出价值: ${sellUsdtValue.toFixed(6)} USDT\n成本: ${cost.toFixed(6)} USDT\n收益: ${profitOrLoss.toFixed(6)} USDT\n时间: ${this.getCurrentDateTime()}`);
    } catch (error) {
        await sender.reply(`卖出时发生错误: ${error.message}\n时间: ${this.getCurrentDateTime()}`);
    }
}

}

module.exports = async (sender) => {
    const msg = sender.getMsg().trim();
    const parts = msg.split(' ');

    const cryptoInvestment = new CryptoInvestment();

    if (msg.startsWith('投资 ')) {
        const currency = parts[1];
        const amount = parseFloat(parts[2]);

        if (isNaN(amount) || amount <= 0) {
            await sender.reply('请输入有效的投资数量。');
            return;
        }

        await cryptoInvestment.invest(sender, currency, amount);
    } else if (msg === '我的投资') {
        await cryptoInvestment.viewInvestments(sender);
    } else if (msg === '可购买币种') {
        await cryptoInvestment.viewPurchasableCurrencies(sender);
    } else if (msg.startsWith('卖出 ')) {
        const currency = parts[1];
        const amount = parseFloat(parts[2]);

        if (isNaN(amount) || amount <= 0) {
            await sender.reply('请输入有效的卖出数量。');
            return;
        }

        await cryptoInvestment.sell(sender, currency, amount);
    } else {
        await sender.reply('未知指令，请使用 "投资 [币种] [数量]"，"我的投资"，"可购买币种" 或 "卖出 [币种] [数量]"。');
    }
};
