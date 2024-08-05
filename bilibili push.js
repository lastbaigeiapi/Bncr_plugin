/**
 * @author 啊屁
 * @team 啊屁
 * @name bilibili push
 * @version 1.0.2
 * @description 获取bilibili开播信息
 * @rule ^bilibili push$
 * @admin true
 * @public false
 * @priority 50
 */

const https = require('https');

// 使用BncrCreateSchema定义JSON Schema
const roomSchema = BncrCreateSchema.object({
  room_id: BncrCreateSchema.number().setTitle('直播间ID').setDescription('B站直播间ID').setDefault(0),
  name: BncrCreateSchema.string().setTitle('主播名称').setDescription('主播的名字').setDefault(''),
  status: BncrCreateSchema.number().setTitle('直播状态').setDescription('当前直播状态').setDefault(0),
  cover: BncrCreateSchema.string().setTitle('封面链接').setDescription('直播间封面图片链接').setDefault(''),
  send_cover: BncrCreateSchema.boolean().setTitle('发送封面').setDescription('是否发送封面图片').setDefault(true),
  title: BncrCreateSchema.string().setTitle('直播标题').setDescription('当前直播的标题').setDefault(''),
  interval: BncrCreateSchema.number().setTitle('检查间隔').setDescription('检查直播状态的间隔(毫秒)').setDefault(60000),
  platforms: BncrCreateSchema.array(
    BncrCreateSchema.object({
      platform: BncrCreateSchema.string().setTitle('平台').setDescription('推送平台名称').setDefault(''),
      user_id: BncrCreateSchema.string().setTitle('用户ID').setDescription('接收推送的用户ID').setDefault(''),
      group_id: BncrCreateSchema.string().setTitle('群组ID').setDescription('接收推送的群组ID').setDefault('')
    }).setTitle('平台配置')
  ).setTitle('推送平台').setDescription('推送平台配置列表').setDefault([]),
  msg: BncrCreateSchema.array(BncrCreateSchema.string()).setTitle('消息模板').setDescription('不同状态的消息模板').setDefault([
    '{name}尚未开播',
    '{name}正在直播：{title} https://live.bilibili.com/{room_id}',
    '{name}正在轮播'
  ]),
});

// 将Schema应用于整个配置
const jsonSchema = BncrCreateSchema.object({
  room_list: BncrCreateSchema.array(roomSchema).setTitle('直播间列表').setDescription('监控的直播间配置列表').setDefault([]),
});

const ConfigDB = new BncrPluginConfig(jsonSchema);

module.exports = async sender => {
  await ConfigDB.get();

  if (!Object.keys(ConfigDB.userConfig).length) {
    return await sender.reply('请先发送"修改无界配置"，或者前往前端web"插件配置"来完成插件首次配置');
  }

  // 启动监控
  startMonitoring(sender);

  // 立即检查并报告所有直播间的状态
  ConfigDB.userConfig.room_list.forEach(room => {
    getLiveRoomData(sender, room.room_id, true);
  });

  return sender.reply('Bilibili直播监控已启动，正在检查当前状态...');
};

function startMonitoring(sender) {
  ConfigDB.userConfig.room_list.forEach((room_data, index) => {
    // 启动时立即查询一次
    setTimeout(() => {
      getLiveRoomData(sender, room_data.room_id);

      // 然后定时查询
      setInterval(() => {
        getLiveRoomData(sender, room_data.room_id);
      }, room_data.interval);
    }, index * 500);  // 错开每个直播间的初始查询时间，避免拥堵
  });
}

// 获取直播间数据
function getLiveRoomData(sender, room_id, forceUpdate = false) {
  const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${room_id}`;
  https.get(url, res => {
    let body = '';

    res.on('data', chunk => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        processRoomData(sender, room_id, json, forceUpdate);
      } catch (error) {
        console.error(`解析直播间 ${room_id} 的数据时出错: ${error.message}`);
      }
    });
  }).on('error', e => {
    console.log(`获取直播间 ${room_id} 的数据时出错: ${e.message}`);
  });
}

function getRoomCfg(room_id) {
  const room = ConfigDB.userConfig.room_list.find(data => data.room_id === room_id);
  if (!room) {
    console.log(`未找到直播间 ${room_id} 的配置`);
  }
  return room;
}

// 处理直播间数据
function processRoomData(sender, room_id, json, forceUpdate = false) {
  const room = getRoomCfg(room_id);
  if (!room) {
    return;
  }

  const status = json.data.room_info.live_status;
  room.cover = json.data.room_info.cover;
  room.title = json.data.room_info.title;

  // 当直播状态变化时或强制更新时发送提示
  if (status !== room.status || forceUpdate) {
    room.status = status;
    sendMsg(sender, room_id, status);
  }
}

// 发送提醒消息
async function sendMsg(sender, room_id, status) {
  const room = getRoomCfg(room_id);
  if (!room) {
    return;
  }

  let msg = room.msg[status];
  if (!msg) {
    return console.log(`未找到直播间 ${room_id} 状态 ${status} 的消息模板`);
  }

  msg = msg.replace('{name}', room.name)
           .replace('{title}', room.title)
           .replace('{room_id}', room.room_id);

  console.log(`准备发送消息: ${msg}`);

  if (room.send_cover && room.cover) {
    try {
      await sender.reply({
        type: 'image',
        path: room.cover
      });
      await sender.reply({
        type: 'text',
        msg: msg
      });
      console.log(`成功为直播间 ${room_id} 发送图片和消息`);
    } catch (error) {
      console.error(`为直播间 ${room_id} 发送图片和消息失败:`, error);
    }
  }
}
