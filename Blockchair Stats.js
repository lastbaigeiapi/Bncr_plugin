/**
 * @author 啊屁
 * @team 啊屁
 * @name Blockchair Stats
 * @version 1.0.2
 * @description 获取区块链统计数据和查询区块链地址信息
 * @rule ^(bitcoin|bitcoin-cash|litecoin|bitcoin-sv|dogecoin|dash|groestlcoin|zcash|ecash|bitcoin/testnet) stats$
 * @rule ^查询地址 (\w+):(\w+)$
 * @admin false
 * @public false
 * @priority 50
 */

const axios = require('axios');

const jsonSchema = BncrCreateSchema.object({
  api_key: BncrCreateSchema.string().setTitle('设置api key').setDescription('配置blockchair api key'),
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

// 区块链API端点
const endpoints = {
    'bitcoin': 'https://api.blockchair.com/bitcoin/stats',
    'bitcoin-cash': 'https://api.blockchair.com/bitcoin-cash/stats',
    'litecoin': 'https://api.blockchair.com/litecoin/stats',
    'bitcoin-sv': 'https://api.blockchair.com/bitcoin-sv/stats',
    'dogecoin': 'https://api.blockchair.com/dogecoin/stats',
    'dash': 'https://api.blockchair.com/dash/stats',
    'groestlcoin': 'https://api.blockchair.com/groestlcoin/stats',
    'zcash': 'https://api.blockchair.com/zcash/stats',
    'ecash': 'https://api.blockchair.com/ecash/stats',
    'bitcoin/testnet': 'https://api.blockchair.com/bitcoin/testnet/stats'
};

// 辅助函数
async function fetchBlockchainStats(url, apiKey) {
    try {
        const fullUrl = `${url}?key=${apiKey}`;
        const response = await axios.get(fullUrl);
        return response.data.data;
    } catch (error) {
        console.error(`获取数据时出错: ${error.message}`);
        if (error.response && error.response.status === 402) {
            throw new Error('无效的 API 令牌,请重新设置');
        }
        throw new Error('无法获取区块链统计数据');
    }
}

async function queryAddress(blockchain, address, apiKey) {
    try {
        const apiUrl = `https://api.blockchair.com/${blockchain}/dashboards/address/${address}?key=${apiKey}`;
        const response = await axios.get(apiUrl);
        
        if (response.data.context.code !== 200) {
            throw new Error('API返回错误');
        }

        const data = response.data.data[address];
        const addressInfo = data.address;
        
        return `
**地址信息 (${blockchain.toUpperCase()})**
- 地址: ${address}
- 类型: ${addressInfo.type}
- 余额: ${addressInfo.balance} (单位: satoshis)
- 余额 (USD): ${addressInfo.balance_usd}$
- 收到总额: ${addressInfo.received}
- 花费总额: ${addressInfo.spent}
- 输出总数: ${addressInfo.output_count}
- 未花费输出数: ${addressInfo.unspent_output_count}
- 首次收到时间: ${addressInfo.first_seen_receiving}
- 最后收到时间: ${addressInfo.last_seen_receiving}
- 首次花费时间: ${addressInfo.first_seen_spending}
- 最后花费时间: ${addressInfo.last_seen_spending}
- 交易总数: ${addressInfo.transaction_count}
        `;
    } catch (error) {
        console.error(`查询地址信息出错: ${error.message}`);
        if (error.response && error.response.status === 402) {
            throw new Error('无效的 API 令牌,请重新设置');
        }
        throw new Error(`查询地址信息时出错。请稍后再试。`);
    }
}

function formatStats(data, currency) {
    return `
**${currency.toUpperCase()} 区块链统计数据**
- 总区块数: ${data.blocks}
- 总交易数: ${data.transactions}
- 总输出数: ${data.outputs}
- 流通货币数量: ${data.circulation} satoshis
- 区块链大小: ${data.blockchain_size} bytes
- 全网节点数: ${data.nodes}
- 当前挖矿难度: ${data.difficulty}
- 24小时哈希率: ${data.hashrate_24h}
- 最新区块高度: ${data.best_block_height}
- 最新区块哈希: ${data.best_block_hash}
- 最新区块时间: ${data.best_block_time}
- 内存池交易数: ${data.mempool_transactions}
- 内存池大小: ${data.mempool_size} bytes
- 市场价格 (USD): ${data.market_price_usd}
- 市值 (USD): ${data.market_cap_usd}
- 建议交易费 (sat/byte): ${data.suggested_transaction_fee_per_byte_sat}
        `;
}

// 主函数
module.exports = async (sender) => {
    const msg = sender.getMsg().trim().toLowerCase();
    
    // 使用全局配置
    const config = await ConfigDB.get();
    const apiKey = config.api_key;

    if (!apiKey) {
        return sender.reply('请先设置 Blockchair API key。');
    }

    // 区块链统计数据查询
    if (/^(bitcoin|bitcoin-cash|litecoin|bitcoin-sv|dogecoin|dash|groestlcoin|zcash|ecash|bitcoin\/testnet) stats$/.test(msg)) {
        const currency = msg.split(' ')[0];
        
        if (endpoints[currency]) {
            try {
                const stats = await fetchBlockchainStats(endpoints[currency], apiKey);
                const output = formatStats(stats, currency);
                await sender.reply(output);
            } catch (error) {
                if (error.message === '无效的 API 令牌,请重新设置') {
                    await sender.reply(error.message);
                } else {
                    await sender.reply(`获取${currency.toUpperCase()}统计数据时出错: ${error.message}`);
                }
            }
        } else {
            await sender.reply('不支持的货币类型，请选择以下之一：bitcoin, bitcoin-cash, litecoin, bitcoin-sv, dogecoin, dash, groestlcoin, zcash, ecash, bitcoin/testnet');
        }
    }
    
    // 地址信息查询
    else if (/^查询地址 (\w+):(\w+)$/.test(msg)) {
        const match = msg.match(/^查询地址 (\w+):(\w+)$/);
        const [_, blockchain, address] = match;

        if (Object.keys(endpoints).includes(blockchain)) {
            try {
                const result = await queryAddress(blockchain, address, apiKey);
                await sender.reply(result);
            } catch (error) {
                if (error.message === '无效的 API 令牌,请重新设置') {
                    await sender.reply(error.message);
                } else {
                    await sender.reply(`查询${blockchain.toUpperCase()}地址信息时出错: ${error.message}`);
                }
            }
        } else {
            await sender.reply('不支持的区块链，请选择以下之一：bitcoin, bitcoin-cash, litecoin, bitcoin-sv, dogecoin, dash, groestlcoin, zcash, ecash, bitcoin/testnet');
        }
    } else {
        await sender.reply('命令格式错误。请使用 "[区块链] stats" 或 "查询地址 [区块链]:[地址]" 的格式。');
    }
};
