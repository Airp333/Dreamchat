require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path')
const Payam = require('./models/message');
const session = require('express-session');
const authRouter = require('./routes/auth.js')
const requireAuth = require('./middleware/requireAuth')
const rateLimit = require('express-rate-limit');
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  message: { error: "Too many messages, please slow down." }
});

app.set('view engine', 'ejs');
app.set('trust proxy', 2)
app.set('views', path.join(__dirname, '/views'));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24
  }
})

app.use(sessionMiddleware);

io.engine.use(sessionMiddleware);

io.on('connection', (socket) => {
  if (!socket.request.session.userId) {
    socket.disconnect();
    return;
  }
  socket.on('chatMessage', (data) => {

    if (!data || data.trim() === "") {
      return;
    }

    if (data.length > 300) {
      return;
    }
    Payam.create({ text: data, username: socket.request.session.username, userId: socket.request.session.userId })
      .then((newMessage) => {

        const botToken = process.env.BOT_TOKEN;
        const chatId = process.env.CHAT_ID;

        if (botToken && chatId) {
          fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `${socket.request.session.username}: ${data}`
            })
          }).catch(err => console.log(err));
        }

        io.emit('chat message', {
          username: socket.request.session.username,
          text: data,
          id: newMessage._id,
          createdAt: newMessage.createdAt
        })
      })
      .catch((err) => {
        socket.emit('Something went wrong')
        console.log(err);
      });
  });

  socket.on('deleteMessage', (data) => {
    Payam.findById(data)
      .then((message) => {
        if (message === null) {
          return;
        }
        if (message.userId.toString() === socket.request.session.userId.toString()) {
          Payam.findByIdAndDelete(data)
            .then(() => { io.emit('message deleted', data) });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

  socket.on('editMessage', (data) => {
    Payam.findById(data.id)
      .then((message) => {
        if (message === null) {
          return;
        }

        if (message.userId.toString() !== socket.request.session.userId.toString()) {
          return;
        }

        if (!data.text || data.text.trim() === "") {
          return;
        }

        if (data.text.length > 400) {
          return;
        }

        Payam.findByIdAndUpdate( data.id, { text: data.text })
          .then(() => {
            io.emit('message edited', { id: data.id, text: data.text });
          });
      })
      .catch((err) => {
        console.error(err);
      });
  });

});

function requireUser(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/auth");
  }
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('mongodb connected'))
  .catch(err => console.error('error:', err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRouter)

app.get("/", requireUser, (req, res) => {
  Payam.find()
    .sort({ createdAt: -1 }).limit(100)
    .then((payams) => {
      payams.reverse();
      const coloredPayam = payams.map((item) => {
        return {
          username: item.username,
          text: item.text,
          color: usernameToColor(item.username),
          id: item._id,
          createdAt: item.createdAt
        }
      });
      res.render("home.ejs", { username: req.session.username, coloredPayam });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Something went wrong");
    });
})

app.get("/auth", (req, res) => {
  res.render("auth.ejs");
})

app.post("/messages", messageLimiter, requireAuth, (req, res) => {
  const text = req.body.text;

  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Message text is required" });
  }

  if (text.length > 1000) {
    return res.status(400).json({ error: "Message is too long" });
  }

  Payam.create({ text: text, username: req.session.username, userId: req.session.userId })
    .then((newMessage) => {
      res.json({ success: true });
    })
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.log(err);
    });
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

function usernameToColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

server.listen(3000, () => {
  console.log('server started successfully');
});
