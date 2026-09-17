require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const sessionMiddleware = require('./config/session');
const authRouter = require('./routes/auth.js');
const pagesRouter = require('./routes/pages');
const messagesRouter = require('./routes/messages');
const registerSocketHandlers = require('./sockets');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('trust proxy', 2);
app.set('views', path.join(__dirname, '/views'));

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();
registerSocketHandlers(io);

app.use('/api/auth', authRouter);
app.use(messagesRouter(io));
app.use(pagesRouter);

server.listen(3000, () => {
  console.log('server started successfully');
});
