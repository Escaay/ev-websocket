let clients = [];
const WebSocket = require('ws');
const axios = require('./utils/axios');
const WebSocketServer = WebSocket.Server;
// 本地
const server = new WebSocket.Server({ port: 3002 });
// 云函数
// const server = new WebSocketServer({
//   host: "0.0.0.0",
//   port: 9000
// });
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
        const { isSender, newMessage, senderUnreadCount, receiverUnreadCount, newChatItem } = obj.data;
        const {
          messageId,
          chatId,
          content,
          senderId,
          receiverId,
          createTime,
        } = newMessage
        // 更新chatList(在这里更新是因为要判断是否需要增加对方的未读数，通过对方是否在当前聊天窗口)
        // partnerChatList = (
        //   await axios.post('/user/queryChatList', {
        //     userId: receiverId,
        //   })
        // ).data;
        const lastMessage = isPicture(content) ? '【图片】' : content;
        const updateChatListPayload = {
          chatId,
          lastMessage,
          lastMessageTime: createTime,
        };

        // const oldPartnerChatItemData = partnerChatList.find(
        //   item => item.chatId === chatId,
        // );
        // // 更新对方的未读数量和最后消息
        // oldPartnerChatItemData.lastMessage = lastMessage;
        // oldPartnerChatItemData.lastMessageTime = createTime

        // 对方是否需要增加未读数
        let shouldAddUnreadCount = false
        // 如果对方也在线且在和当我聊天的聊天窗口，就不会更新他的unReadCount,其他情况都要未读数加1
        if (
          !(
            clients.find(item => item.userId === receiverId)?.partnerId ===
            client.userId
          )
        ) {
          shouldAddUnreadCount = true
          isSender
          ? (updateChatListPayload.receiverUnreadCount =
              receiverUnreadCount + 1)
          : (updateChatListPayload.senderUnreadCount =
              senderUnreadCount + 1);
        }
        await axios.post('/user/updateChatList', updateChatListPayload);
        // 如果接收者也在线，那就给接收者的客户端发送消息
        clients.forEach(clientItem => {
          if (clientItem.userId === receiverId) {
            clientItem.send(JSON.stringify({
              type: obj.type,
              data: {
                newMessage,
                newChatItem,
                lastMessage,
                shouldAddUnreadCount,
                // 对方的isSender应该是发送方的相反
                isSender: !isSender,
                lastMessageTime: createTime,
              }
            }));
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
      
      case 'sendComment':
        // 告诉文章的发送者, 评论消息数量 + 1
        clients.forEach(clientItem => {
          if (clientItem.userId === obj.data.receiverId) {
            clientItem.send(JSON.stringify(obj));
          }
        });
        break;
      case 'likeArticle':
        clients.forEach(clientItem => {
          console.log(123)
          // 告诉文章的发送者他的文章被点赞了,消息数量 + 1
          if (clientItem.userId === obj.data.receiverId) {
            clientItem.send(JSON.stringify(obj));
          }
        });
        break;
      case 'likeArticleComment':
        clients.forEach(clientItem => {
          // 告诉评论的发送者他的评论被点赞了, 消息数量 + 1
          if (clientItem.userId === obj.data.receiverId) {
            clientItem.send(JSON.stringify(obj));
          }
        });
        break;
        case 'teamApplication':
          clients.forEach(clientItem => {
            // 告诉评论的发送者他的评论被点赞了, 消息数量 + 1
            if (clientItem.userId === obj.data.receiverId) {
              clientItem.send(JSON.stringify(obj));
            }
          });
          break;
    }
  });

  // 处理连接关闭
  client.on('close', () => {
    console.log(`${client.userId}触发close`)
    clients = clients.filter(item => item !== client);
  });
});
