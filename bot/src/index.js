const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const { Queue } = require('bullmq');
require('dotenv').config();

(async () => {
  const { state, saveState } = await useMultiFileAuthState('./auth');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
      console.log('connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        process.exit(0);
      }
    }
  });

  const taskQueue = new Queue('taskQueue', { connection: { host: process.env.REDIS_HOST || 'redis', port: 6379 } });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || !msg.key || msg.key.fromMe) continue;
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!text) {
        await sock.sendMessage(msg.key.remoteJid, { text: 'Solo respondo a mensajes de texto.' });
        continue;
      }
      await taskQueue.add('processMessage', { jid: msg.key.remoteJid, text, timestamp: Date.now() });
    }
  });
})();
