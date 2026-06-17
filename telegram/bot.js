const TelegramBot = require('node-telegram-bot-api');
const { connectWhatsApp, getSession, getAllSessions, removeSession } = require('../lib/connect');
const { handleWAMessage } = require('../commands/handler');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
const BOT_NAME = process.env.BOT_NAME || 'DEV SHADOW MD BOT';
const ADMIN_PASSWORD = '26102008';

if (!TOKEN) { console.error('❌ TELEGRAM_TOKEN manquant !'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

// ============================================
// DONNÉES EN MÉMOIRE
// ============================================
const confirmedUsers = new Set();
const adminSessions = new Set();
const waitingPassword = new Set();
const bannedUsers = new Set();
const broadcastWaiting = new Map();

// ============================================
// CANAUX REQUIS
// ============================================
const REQUIRED_CHANNELS = [
  { name: '📢 Canal Officiel', link: 'https://t.me/+dxH_OGPd269mMjM0', id: -1004410224011 },
  { name: '👥 Groupe Officiel', link: 'https://t.me/+Le-FgJipb-UyMDY0', id: -1004407166762 }
];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

async function checkUserJoined(userId) {
  const notJoined = [];
  for (const channel of REQUIRED_CHANNELS) {
    try {
      const member = await bot.getChatMember(channel.id, userId);
      if (!['member', 'administrator', 'creator'].includes(member.status)) {
        notJoined.push(channel);
      }
    } catch (e) {
      notJoined.push(channel);
    }
  }
  return notJoined;
}

async function sendForceSubscribe(chatId) {
  await bot.sendMessage(chatId, `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 *𝑫𝑬𝑽 𝑺𝑯𝑨𝑫𝑶𝑾 𝑴𝑫 𝑩𝑶𝑻*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

⚠️ *Pour utiliser ce bot, vous devez rejoindre:*

1. 📢 Canal Officiel
2. 👥 Groupe Officiel

👇 *Cliquez sur les boutons pour rejoindre !*
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        ...REQUIRED_CHANNELS.map(c => ([{ text: c.name, url: c.link }])),
        [{ text: '✅ J\'ai rejoint tous les canaux !', callback_data: 'check_joined' }]
      ]
    }
  });
}

async function sendMainMenu(chatId) {
  await bot.sendMessage(chatId, `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 *𝑫𝑬𝑽 𝑺𝑯𝑨𝑫𝑶𝑾 𝑴𝑫 𝑩𝑶𝑻*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

✅ *Bienvenue !* 👋

📱 *Commandes disponibles:*

/connecter +221XXXXXXXX
→ Connecter votre WhatsApp

/deconnecter
→ Déconnecter votre WhatsApp

/status
→ Voir l'état de votre connexion

━━━━━━━━━━━━━━━━━━━━━━
✅ Une fois connecté, tapez *.menu* sur WhatsApp !
  `, { parse_mode: 'Markdown' });
}

async function sendAdminPanel(chatId) {
  const total = getAllSessions().size;
  await bot.sendMessage(chatId, `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║     👑 *PANEL ADMIN*     ║
║  *𝑫𝑬𝑽 𝑺𝑯𝑨𝑫𝑶𝑾 𝑴𝑫 𝑩𝑶𝑻*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

👥 *Sessions actives:* ${total}
🚫 *Utilisateurs bannis:* ${bannedUsers.size}
⏱️ *Uptime:* ${formatUptime(process.uptime())}
💻 *RAM:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 Statistiques', callback_data: 'admin_stats' },
          { text: '👥 Utilisateurs', callback_data: 'admin_users' }
        ],
        [
          { text: '📢 Broadcast', callback_data: 'admin_broadcast' },
          { text: '🔄 Restart Bot', callback_data: 'admin_restart' }
        ],
        [
          { text: '🚫 Bannir User', callback_data: 'admin_ban' },
          { text: '✅ Débannir User', callback_data: 'admin_unban' }
        ],
        [
          { text: '📋 Liste Bannis', callback_data: 'admin_banlist' },
          { text: '🔌 Déconnecter All', callback_data: 'admin_disconnectall' }
        ],
        [{ text: '🚪 Fermer Panel', callback_data: 'admin_logout' }]
      ]
    }
  });
}

// ============================================
// /start
// ============================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (confirmedUsers.has(userId)) return sendMainMenu(chatId);
  await sendForceSubscribe(chatId);
});

// ============================================
// /connecter sans argument
// ============================================
bot.onText(/^\/connecter$/, (msg) => {
  bot.sendMessage(msg.chat.id, `
❌ *Numéro manquant !*

📌 *Utilisation:*
\`/connecter +221XXXXXXXX\`

💡 *Exemples:*
• \`/connecter +221771234567\`
• \`/connecter 221771234567\`
• \`/connecter +33612345678\`
  `, { parse_mode: 'Markdown' });
});

// ============================================
// /connecter avec numéro
// ============================================
bot.onText(/\/connecter (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const phone = match[1].trim().replace(/[^0-9]/g, '');

  if (!phone || phone.length < 10) {
    return bot.sendMessage(chatId, '❌ Numéro invalide !\n\nExemple: /connecter +221XXXXXXXX');
  }

  if (getSession(userId)) {
    return bot.sendMessage(chatId, '⚠️ Vous êtes déjà connecté !\n\nUtilisez /deconnecter d\'abord.');
  }

  const loadingMsg = await bot.sendMessage(chatId, `⏳ Génération du code pairing pour *+${phone}*...\n\n_Veuillez patienter 5 secondes..._`, { parse_mode: 'Markdown' });

  try {
    await connectWhatsApp(
      userId,
      phone,
      async (code, error) => {
        if (error || !code) {
          await bot.editMessageText(
            `❌ Erreur:\n${error || 'Code non reçu'}\n\nRéessayez avec /connecter +${phone}`,
            { chat_id: chatId, message_id: loadingMsg.message_id }
          );
          return;
        }
        await bot.editMessageText(
          `╔══════════════════════╗\n║   🔑 CODE PAIRING    ║\n╚══════════════════════╝\n\n*Votre code:*\n\`${code}\`\n\n📱 *Comment l'utiliser:*\n1️⃣ Ouvrez WhatsApp\n2️⃣ Paramètres → Appareils connectés\n3️⃣ Connecter un appareil\n4️⃣ Connecter avec numéro\n5️⃣ Entrez le code\n\n⏰ *Expire dans 60 secondes !*`,
          { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
        );
      },
      async (sock) => {
        await bot.sendMessage(chatId, `✅ *WhatsApp connecté !*\n\n📱 Numéro: +${phone}\n\nTapez *.menu* sur WhatsApp !`, { parse_mode: 'Markdown' });
      },
      (sock, msg, uid) => {
        handleWAMessage(sock, msg, uid, bot);
      }
    );
  } catch (err) {
    await bot.editMessageText(
      `❌ Erreur: ${err.message}`,
      { chat_id: chatId, message_id: loadingMsg.message_id }
    );
  }
});

// ============================================
// /deconnecter
// ============================================
bot.onText(/\/deconnecter/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const session = getSession(userId);

  if (!session) {
    return bot.sendMessage(chatId, `❌ *Vous n'êtes pas connecté !*\n\nUtilisez /connecter +221XXXXXXXX`, { parse_mode: 'Markdown' });
  }

  try { await session.logout(); } catch (e) {}
  removeSession(userId);

  const sessionDir = path.join(__dirname, '../session', userId);
  try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}

  bot.sendMessage(chatId, '✅ *WhatsApp déconnecté avec succès !*', { parse_mode: 'Markdown' });
});

// ============================================
// /status
// ============================================
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const session = getSession(userId);

  if (session) {
    bot.sendMessage(chatId, `✅ *Statut: Connecté*\n\nTapez *.menu* sur WhatsApp.`, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, `❌ *Statut: Non connecté*\n\nUtilisez /connecter +XXXXXXXXXXX`, { parse_mode: 'Markdown' });
  }
});

// ============================================
// /admin
// ============================================
bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (adminSessions.has(userId)) return sendAdminPanel(chatId);

  waitingPassword.add(userId);
  await bot.sendMessage(chatId, `🔐 *PANEL ADMIN*\n\nEntrez le mot de passe:`, { parse_mode: 'Markdown' });
});

// ============================================
// MESSAGES TEXTE (mot de passe + broadcast)
// ============================================
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  // Vérification mot de passe
  if (waitingPassword.has(userId)) {
    waitingPassword.delete(userId);
    if (text === ADMIN_PASSWORD) {
      adminSessions.add(userId);
      await bot.sendMessage(chatId, '✅ *Accès accordé !*', { parse_mode: 'Markdown' });
      return sendAdminPanel(chatId);
    } else {
      return bot.sendMessage(chatId, '❌ *Mot de passe incorrect !*\n\nRéessayez avec /admin', { parse_mode: 'Markdown' });
    }
  }

  // Broadcast en attente
  if (broadcastWaiting.has(userId)) {
    broadcastWaiting.delete(userId);
    const sessions = getAllSessions();
    let count = 0;
    for (const [uid, sock] of sessions) {
      try {
        const ownNumber = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(ownNumber, { text: `📢 *Message du Owner:*\n\n${text}` });
        count++;
      } catch (e) {}
    }
    await bot.sendMessage(chatId, `✅ *Broadcast envoyé à ${count} utilisateurs !*`, { parse_mode: 'Markdown' });
    return sendAdminPanel(chatId);
  }
});

// ============================================
// CALLBACKS
// ============================================
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  // ===== FORCE SUBSCRIBE =====
  if (data === 'check_joined') {
    await bot.answerCallbackQuery(query.id, { text: '🔍 Vérification en cours...', show_alert: false });

    const notJoined = await checkUserJoined(userId);

    if (notJoined.length > 0) {
      const list = notJoined.map(c => `❌ ${c.name}`).join('\n');
      return bot.sendMessage(chatId, `
⚠️ *Vous n'avez pas encore tout rejoint !*

*Canaux manquants:*
${list}

👇 *Rejoignez-les d'abord puis cliquez sur ✅*
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            ...notJoined.map(c => ([{ text: c.name, url: c.link }])),
            [{ text: '✅ J\'ai rejoint tous les canaux !', callback_data: 'check_joined' }]
          ]
        }
      });
    }

    confirmedUsers.add(userId);
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) {}
    await bot.sendMessage(chatId, '✅ *Merci d\'avoir rejoint ! Bienvenue !* 🎉', { parse_mode: 'Markdown' });
    return sendMainMenu(chatId);
  }

  // ===== PANEL ADMIN =====
  if (!adminSessions.has(userId)) {
    return bot.answerCallbackQuery(query.id, { text: '❌ Accès refusé !', show_alert: true });
  }

  await bot.answerCallbackQuery(query.id);

  if (data === 'admin_stats') {
    await bot.sendMessage(chatId, `📊 *Statistiques*\n\n👥 Sessions: ${getAllSessions().size}\n🚫 Bannis: ${bannedUsers.size}\n⏱️ Uptime: ${formatUptime(process.uptime())}\n💻 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, { parse_mode: 'Markdown' });

  } else if (data === 'admin_users') {
    const sessions = getAllSessions();
    if (sessions.size === 0) {
      await bot.sendMessage(chatId, '❌ Aucun utilisateur connecté !');
    } else {
      let list = '👥 *Utilisateurs connectés:*\n\n';
      let i = 1;
      for (const [uid, sock] of sessions) {
        const num = sock.user?.id?.split(':')[0] || 'Inconnu';
        list += `${i}. 📱 +${num} (ID: ${uid})\n`;
        i++;
      }
      await bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
    }

  } else if (data === 'admin_broadcast') {
    broadcastWaiting.set(userId, true);
    await bot.sendMessage(chatId, '📢 *Entrez le message à broadcaster:*', { parse_mode: 'Markdown' });

  } else if (data === 'admin_restart') {
    await bot.sendMessage(chatId, '🔄 *Redémarrage du bot...*', { parse_mode: 'Markdown' });
    setTimeout(() => process.exit(0), 1000);

  } else if (data === 'admin_ban') {
    await bot.sendMessage(chatId, '🚫 *Entrez l\'ID Telegram à bannir:*', { parse_mode: 'Markdown' });
    bot.once('message', async (m) => {
      if (m.chat.id === chatId) {
        bannedUsers.add(m.text);
        await bot.sendMessage(chatId, `✅ Utilisateur *${m.text}* banni !`, { parse_mode: 'Markdown' });
      }
    });

  } else if (data === 'admin_unban') {
    await bot.sendMessage(chatId, '✅ *Entrez l\'ID Telegram à débannir:*', { parse_mode: 'Markdown' });
    bot.once('message', async (m) => {
      if (m.chat.id === chatId) {
        bannedUsers.delete(m.text);
        await bot.sendMessage(chatId, `✅ Utilisateur *${m.text}* débanni !`, { parse_mode: 'Markdown' });
      }
    });

  } else if (data === 'admin_banlist') {
    if (bannedUsers.size === 0) {
      await bot.sendMessage(chatId, '✅ Aucun utilisateur banni !');
    } else {
      let list = '🚫 *Liste des bannis:*\n\n';
      let i = 1;
      bannedUsers.forEach(id => { list += `${i}. ${id}\n`; i++; });
      await bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
    }

  } else if (data === 'admin_disconnectall') {
    const sessions = getAllSessions();
    let count = 0;
    for (const [uid, sock] of sessions) {
      try { await sock.logout(); } catch (e) {}
      removeSession(uid);
      count++;
    }
    await bot.sendMessage(chatId, `✅ *${count} sessions déconnectées !*`, { parse_mode: 'Markdown' });

  } else if (data === 'admin_logout') {
    adminSessions.delete(userId);
    await bot.sendMessage(chatId, '🚪 *Panel admin fermé !*', { parse_mode: 'Markdown' });
  }
});

// Gestion erreurs polling
bot.on('polling_error', (err) => {
  console.error('❌ Telegram polling error:', err.message);
});

console.log('✅ Bot Telegram démarré avec succès !');

module.exports = bot;
