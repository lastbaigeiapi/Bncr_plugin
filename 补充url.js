/**
 * @author 啊屁
 * @name URL补全插件
 * @team 啊屁
 * @origin 啊屁
 * @version 1.0.1
 * @description 自动补全缺少协议的URL，支持处理带有多个URL的文本
 * @create_at 2024-10-14 12:00:00
 * @rule (u.jd.com|kurl\d+.cn|3.cn|p.pinduoduo.com|mobile.yangkeduo.com|e.tb.cn|v.buydouke.com|v.douyin.com|m.vip.com|t.vip.com)[/\d\w]+
 * @priority 9999
 * @disable false
 * @admin true
 */

module.exports = async function (s) {
    // 获取用户输入的内容
    let input = s.getMsg();

    // 正则表达式匹配URL，适配没有协议的情况
    let urlPattern = /(u\.jd\.com|kurl\d+\.cn|3\.cn|p\.pinduoduo\.com|mobile\.yangkeduo\.com|e\.tb\.cn|v\.buydouke\.com|v\.douyin\.com|m\.vip\.com|t\.vip\.com)\/[\d\w]+/g;

    // 正则表达式检查是否有协议
    let protocolPattern = /^(http:\/\/|https:\/\/)/i;

    // 对文本进行匹配，找到所有符合条件的URL
    let urls = input.match(urlPattern);

    if (urls) {
        // 遍历匹配到的URL，检查并补全协议
        urls.forEach(url => {
            if (!protocolPattern.test(url)) {
                // 如果没有协议，则将该URL替换为带有https://的完整URL
                input = input.replace(url, "https://" + url);
            }
        });
    }

    // 将修改后的消息设置回去
    s.setMsg(input);

    // 继续传递给后续插件处理
    return 'next';
};
