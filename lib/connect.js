const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const sessions = new Map();
const processedMessages = new Set(); // Anti-doublon

async function connectWhatsApp(userId, phoneNumber, onPairingCode, onConnected, onMessage) {
  const sessionDir = path.join(__dirname, '../session', String(userId));

  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: false,
  });

  if (!sock.authState.creds.registered && phoneNumber) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      const code = await sock.requestPairingCode(cleanNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
      if (onPairingCode) onPairingCode(formattedCode);
    } catch (err) {
      console.error('Erreur pairing code:', err.message);
      if (onPairingCode) onPairingCode(null, err.message);
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ WhatsApp connecté: ${userId}`);
      sessions.set(String(userId), sock);
      if (onConnected) onConnected(sock);

      const BOT_NAME = process.env.BOT_NAME || 'DEV SHADOW MD BOT';
      const PREFIX = process.env.PREFIX || '.';
      const ownNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';

      setTimeout(async () => {
        try {
          await sock.sendMessage(ownNumber, {
            image: { url: 'https://files.catbox.moe/063nfo.jpg' },
            caption: `╔━━━『 🤖 ${BOT_NAME} 』━━━╗

✅ 𝕮𝖔𝖓𝖓𝖊𝖈𝖙é 𝖆𝖛𝖊𝖈 𝕾𝖚𝖈𝖈è𝖘 !

👑 +${sock.user?.id?.split(':')[0]}
⚡ 𝕾𝖙𝖆𝖙𝖚𝖙 : 𝕺𝖓𝖑𝖎𝖓𝖊 ✅
🕐 ${new Date().toLocaleTimeString()}
📅 ${new Date().toLocaleDateString()}

📖 𝕿𝖆𝖕𝖊𝖟 *${PREFIX}menu*

╚━━━━━━━━━━━━━━━━━━━━╝`
          });
        } catch (e) {
          console.log('Erreur message bienvenue:', e.message);
        }
      }, 3000);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`❌ Déconnecté (${userId}): code ${statusCode}`);
      sessions.delete(String(userId));

      if (statusCode !== DisconnectReason.loggedOut) {
        console.log(`🔄 Reconnexion dans 5s...`);
        setTimeout(() => connectWhatsApp(userId, phoneNumber, null, onConnected, onMessage), 5000);
      } else {
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch (e) {}
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;

      // Anti-doublon: ignorer les messages déjà traités
      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) continue;
      processedMessages.add(msgId);

      // Nettoyer les vieux IDs après 5 minutes
      setTimeout(() => processedMessages.delete(msgId), 5 * 60 * 1000);

      if (onMessage) onMessage(sock, msg, String(userId));
    }
  });

  return sock;
}

function getSession(userId) {
  return sessions.get(String(userId));
}

function getAllSessions() {
  return sessions;
}

function removeSession(userId) {
  sessions.delete(String(userId));
}

module.exports = { connectWhatsApp, getSession, getAllSessions, removeSession };
