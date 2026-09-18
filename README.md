# Dreamchat

A simple and minimal chat app built with Node.js.

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Airp333/Dreamchat
cd dreamchat
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory with the following values:

```env
SESSION_SECRET=       # a long random string, can be anything
BOT_TOKEN=             # a Telegram bot token (get one from @BotFather on Telegram)
CHAT_ID=                # a Telegram group, user, or channel ID for the bot to send messages to
CLOUDINARY_CLOUD_NAME=  # from your Cloudinary account (free plan works)
CLOUDINARY_API_KEY=     # from your Cloudinary account
CLOUDINARY_API_SECRET=  # from your Cloudinary account
MONGODB_URI=            # your MongoDB connection string (a free MongoDB Atlas cluster works)
```

**Notes:**
- **Telegram bot**: Message [@BotFather](https://t.me/BotFather) on Telegram to create a bot and get your `BOT_TOKEN`.
- **Cloudinary**: Sign up for a free account at [cloudinary.com](https://cloudinary.com) to get your cloud name, API key, and API secret.
- **MongoDB**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) to get your `MONGODB_URI`.

### 4. Start the server

```bash
node index.js
```

## ⚠️ Warning

Do **not** run `eclipseCannon.js`. This script deletes everything in the database.

## License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

If you take the source code, modify it, and create your own version, you must also open source your version under the same license. See the [LICENSE](LICENSE) file for full details.
