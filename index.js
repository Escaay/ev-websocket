let clients = [];
const WebSocket = require('ws');
const axios = require('./utils/axios');
const WebSocketServer = WebSocket.Server;
// 本地
// const server = new WebSocket.Server({ port: 3002 });
// 云函数
const server = new WebSocketServer({
  host: "0.0.0.0",
  port: 9000
});
const isPicture = value => {
  return value?.startsWith('data:image/png;base64') && value.length > 1000;
};
console.log('启动成功');
// 当有客户端连接时触发

server.on('connection', client => {

  // 处理收到的消息
  client.on('message', async data => {
    const obj = JSON.parse(data);
    // console.log(data.length < 1000 ? obj : '');
    const type = obj.type;
    let partnerChatList;
    switch (type) {
      case 'init':
        // 去重，防止重复注册
        const userId = obj.data.userId;
        client.userId = userId;
        clients = clients.filter(item => item.userId !== userId);
        clients.push(client);
        console.log(`${userId}注册了`)
        console.log(`当前用户列表`)
        clients.forEach((item)=> {
          console.log(item.userId)
        })
        break;
      case 'sendMessage':
        try {
        const { chatId, content, receiverId, createTime } = obj.data;
        // 替接收者更新chatList
        partnerChatList = (
          await axios.post('/user/queryChatList', {
            userId: receiverId,
          })
        ).data;
          console.log(`sendMessage${content}`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
        const lastMessage = isPicture(content) ? '【图片】' : content;
        const oldPartnerChatItemData = partnerChatList.find(
          item => item.chatId === chatId,
        );
        // 更新对方的未读数量和最后消息
        oldPartnerChatItemData.lastMessage = lastMessage;
        oldPartnerChatItemData.lastMessageTime = createTime
        // 如果对方也在线且在和当我聊天的聊天窗口，那么就不会更新他的unReadCount
        if (
          !(
            clients.find(item => item.userId === receiverId)?.partnerId ===
            client.userId
          )
        ) {
          oldPartnerChatItemData.unReadCount =
            oldPartnerChatItemData.unReadCount
              ? oldPartnerChatItemData.unReadCount + 1
              : 1;
          obj.data.shouldUpdateUnReadCount = true;
        }
        await axios.post('/user/updateChatList', {
          userId: receiverId,
          chatList: partnerChatList,
        });
        console.log('clients.length', clients.length)
        // 如果接收者也在线，那就给接收者的客户端发送消息
        clients.forEach(clientItem => {
          if (clientItem.userId === obj.data.receiverId) {
            clientItem.send(JSON.stringify(obj));
          }
        });
      } catch (e) {
        console.log('sendMessage 报错', e)
      }
        break;
      case 'createChat':
        const { partnerId, newPartnerChatItemData } = obj.data;
        // 替对方更新聊天列表
        partnerChatList = (
          await axios.post('/user/queryChatList', {
            userId: partnerId,
          })
        ).data;
        const noPartnerInfoData = {...newPartnerChatItemData}
        delete noPartnerInfoData.partnerInfo
        const newPartnerChatList = [noPartnerInfoData, ...partnerChatList];
        await axios.post('/user/updateChatList', {
          userId: partnerId,
          chatList: newPartnerChatList,
        });

        clients.forEach(clientItem => {
          if (clientItem.userId === partnerId) {
            clientItem.send(JSON.stringify(obj));
          }
        });

        break;

      case 'changeChating':
        console.log('changeChating');
        client.partnerId = obj.data.partnerId;
        break;
    }
  });

  // 处理连接关闭
  client.on('close', () => {
    console.log(`${client.userId}触发close`)
    clients = clients.filter(item => item !== client);
  });
});
