/**
 * @author 啊屁
 * @team 啊屁
 * @name fast
 * @version 1.0.3
 * @description 使用 speedtest-net 进行网络测速
 * @rule ^(speedtest)$
 * @admin true
 * @public false
 * @priority 1
 * @disable false
 */

module.exports = async (sender) => {
    try {
        // 确保 speedtest-net 包已安装
        await sysMethod.testModule(['speedtest-net'], { install: true });

        const speedTest = require('speedtest-net');

        await sender.reply("开始进行网络测速，请稍候...");

        // 运行测速并等待结果
        const result = await speedTest({ acceptLicense: true, acceptGdpr: true });

        // 格式化输出结果
        const output = `
**Speedtest 结果**
- 服务器: ${result.server.name} (${result.server.location}, ${result.server.country})
- 下载速度: ${(result.download.bandwidth / 125000).toFixed(2)} Mbps
- 上传速度: ${(result.upload.bandwidth / 125000).toFixed(2)} Mbps
- Ping: ${result.ping.latency.toFixed(2)} ms
- ISP: ${result.isp}
- 外网 IP: ${result.interface.externalIp}
- 丢包率: ${result.packetLoss.toFixed(2)}%
- 抖动: ${result.ping.jitter}ms
- 延迟: ${result.ping.latency}ms
- 测试结果链接: [查看结果](${result.result.url})
        `;

        await sender.reply(output);
    } catch (error) {
        console.error(`测速错误: ${error.message}`);
        await sender.reply('测速过程中出现错误，请稍后再试。');
    }
};
