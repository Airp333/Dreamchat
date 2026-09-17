// Part of Dreamchat — licensed under GPLv3. See LICENSE.

const Message = require('../models/message');

module.exports = function (io) {
  io.on('connection', (socket) => {
    if (!socket.request.session.userId) {
      socket.disconnect();
      return;
    }

    socket.on('chatMessage', ({ text, replyTo, replyToUsername, replyToText }) => {
      if (!text || text.trim() === "") return;
      if (text.length > 300) return;

      Message.create({
        text: text,
        username: socket.request.session.username,
        userId: socket.request.session.userId,
        replyTo: replyTo,
        replyToUsername: replyToUsername,
        replyToText: replyToText
      })
        .then((newMessage) => {
          const botToken = process.env.BOT_TOKEN;
          const chatId = process.env.CHAT_ID;

          if (botToken && chatId) {
            fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `${socket.request.session.username}: ${text}`
              })
            }).catch(err => console.log(err));
          }

          io.emit('chat message', {
            username: socket.request.session.username,
            text: text,
            id: newMessage._id,
            createdAt: newMessage.createdAt,
            replyTo: replyTo,
            replyToUsername: replyToUsername,
            replyToText: replyToText
          });
        })
        .catch((err) => {
          socket.emit('Something went wrong');
          console.log(err);
        });
    });

    socket.on('deleteMessage', (data) => {
      Message.findById(data)
        .then((message) => {
          if (message === null) return;
          if (message.userId.toString() === socket.request.session.userId.toString()) {
            Message.findByIdAndDelete(data)
              .then(() => { io.emit('message deleted', data); });
          }
        })
        .catch((err) => console.error(err));
    });

    socket.on('editMessage', (data) => {
      Message.findById(data.id)
        .then((message) => {
          if (message === null) return;
          if (message.userId.toString() !== socket.request.session.userId.toString()) return;
          if (!data.text || data.text.trim() === "") return;
          if (data.text.length > 400) return;

          Message.findByIdAndUpdate(data.id, { text: data.text })
            .then(() => {
              io.emit('message edited', { id: data.id, text: data.text });
            });
        })
        .catch((err) => console.error(err));
    });
  });
};
