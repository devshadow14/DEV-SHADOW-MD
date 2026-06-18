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
║  🤖 *𝕯𝖊𝖛 𝕾𝖍𝖆𝖉𝖔𝖜 𝕸𝖉 𝕭𝖔𝖙*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

⚠️ *𝕻𝖔𝖚𝖗 𝖚𝖙𝖎𝖑𝖎𝖘𝖊𝖗 𝖈𝖊 𝖇𝖔𝖙, 𝖛𝖔𝖚𝖘 𝖉𝖊𝖛𝖊𝖟 𝖗𝖊𝖏𝖔𝖎𝖓𝖉𝖗𝖊 :*

𝟏. 📢 𝕮𝖆𝖓𝖆𝖑 𝕺𝖋𝖋𝖎𝖈𝖎𝖊𝖑
𝟐. 👥 𝕲𝖗𝖔𝖚𝖕𝖊 𝕺𝖋𝖋𝖎𝖈𝖎𝖊𝖑

👇 *𝕮𝖑𝖎𝖖𝖚𝖊𝖟 𝖘𝖚𝖗 𝖑𝖊𝖘 𝖇𝖔𝖚𝖙𝖔𝖓𝖘 𝖕𝖔𝖚𝖗 𝖗𝖊𝖏𝖔𝖎𝖓𝖉𝖗𝖊 !*
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        ...REQUIRED_CHANNELS.map(c => ([{ text: c.name, url: c.link }])),
        [{ text: '✅ 𝕵\'𝖆𝖎 𝖗𝖊𝖏𝖔𝖎𝖓𝖙 𝖙𝖔𝖚𝖘 𝖑𝖊𝖘 𝖈𝖆𝖓𝖆𝖚𝖝 !', callback_data: 'check_joined' }]
      ]
    }
  });
}

async function sendMainMenu(chatId) {
  await bot.sendMessage(chatId, `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 *𝕯𝖊𝖛 𝕾𝖍𝖆𝖉𝖔𝖜 𝕸𝖉 𝕭𝖔𝖙*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

✅ *𝕭𝖎𝖊𝖓𝖛𝖊𝖓𝖚𝖊 !* 👋

📱 *𝕮𝖔𝖒𝖒𝖆𝖓𝖉𝖊𝖘 𝖉𝖎𝖘𝖕𝖔𝖓𝖎𝖇𝖑𝖊𝖘 :*

/connecter +221XXXXXXXX
→ 𝕮𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝖛𝖔𝖙𝖗𝖊 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕

/deconnecter
→ 𝕯é𝖈𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝖛𝖔𝖙𝖗𝖊 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕

/status
→ 𝖁𝖔𝖎𝖗 𝖑'é𝖙𝖆𝖙 𝖉𝖊 𝖛𝖔𝖙𝖗𝖊 𝖈𝖔𝖓𝖓𝖊𝖝𝖎𝖔𝖓

━━━━━━━━━━━━━━━━━━━━━━
✅ 𝖀𝖓𝖊 𝖋𝖔𝖎𝖘 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é, 𝖙𝖆𝖕𝖊𝖟 *.menu* 𝖘𝖚𝖗 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕 !
  `, { parse_mode: 'Markdown' });
}

async function sendAdminPanel(chatId) {
  const total = getAllSessions().size;
  await bot.sendMessage(chatId, `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║     👑 *𝕻𝖆𝖓𝖊𝖑 𝕬𝖉𝖒𝖎𝖓*     ║
║  *𝕯𝖊𝖛 𝕾𝖍𝖆𝖉𝖔𝖜 𝕸𝖉 𝕭𝖔𝖙*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

👥 *𝕾𝖊𝖘𝖘𝖎𝖔𝖓𝖘 𝖆𝖈𝖙𝖎𝖛𝖊𝖘 :* ${total}
🚫 *𝖀𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗𝖘 𝖇𝖆𝖓𝖓𝖎𝖘 :* ${bannedUsers.size}
⏱️ *𝖀𝖕𝖙𝖎𝖒𝖊 :* ${formatUptime(process.uptime())}
💻 *𝕽𝕬𝕸 :* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📊 𝕾𝖙𝖆𝖙𝖎𝖘𝖙𝖎𝖖𝖚𝖊𝖘', callback_data: 'admin_stats' },
          { text: '👥 𝖀𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗𝖘', callback_data: 'admin_users' }
        ],
        [
          { text: '📢 𝕭𝖗𝖔𝖆𝖉𝖈𝖆𝖘𝖙', callback_data: 'admin_broadcast' },
          { text: '🔄 𝕽𝖊𝖘𝖙𝖆𝖗𝖙 𝕭𝖔𝖙', callback_data: 'admin_restart' }
        ],
        [
          { text: '🚫 𝕭𝖆𝖓𝖓𝖎𝖗 𝖀𝖘𝖊𝖗', callback_data: 'admin_ban' },
          { text: '✅ 𝕯é𝖇𝖆𝖓𝖓𝖎𝖗 𝖀𝖘𝖊𝖗', callback_data: 'admin_unban' }
        ],
        [
          { text: '📋 𝕷𝖎𝖘𝖙𝖊 𝕭𝖆𝖓𝖓𝖎𝖘', callback_data: 'admin_banlist' },
          { text: '🔌 𝕯é𝖈𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝕬𝖑𝖑', callback_data: 'admin_disconnectall' }
        ],
        [{ text: '🚪 𝕱𝖊𝖗𝖒𝖊𝖗 𝕻𝖆𝖓𝖊𝖑', callback_data: 'admin_logout' }]
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

  // Envoi de la vidéo avec le texte de bienvenue
  await bot.sendVideo(chatId, 'https://files.catbox.moe/vw6pys.mp4', {
    caption: `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 𝕯𝖊𝖛 𝕾𝖍𝖆𝖉𝖔𝖜 𝕸𝖉 𝕭𝖔𝖙  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

✅ 𝕭𝖎𝖊𝖓𝖛𝖊𝖓𝖚𝖊 ! 👋

📱 𝕮𝖔𝖒𝖒𝖆𝖓𝖉𝖊𝖘 𝖉𝖎𝖘𝖕𝖔𝖓𝖎𝖇𝖑𝖊𝖘 :

/connecter +221XXXXXXXX
→ 𝕮𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝖛𝖔𝖙𝖗𝖊 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕

/deconnecter
→ 𝕯é𝖈𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝖛𝖔𝖙𝖗𝖊 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕

/status
→ 𝖁𝖔𝖎𝖗 𝖑'é𝖙𝖆𝖙 𝖉𝖊 𝖛𝖔𝖙𝖗𝖊 𝖈𝖔𝖓𝖓𝖊𝖝𝖎𝖔𝖓

━━━━━━━━━━━━━━━━━━━━━━
✅ 𝖀𝖓𝖊 𝖋𝖔𝖎𝖘 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é, 𝖙𝖆𝖕𝖊𝖟 .menu 𝖘𝖚𝖗 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕 !
    `,
    parse_mode: 'Markdown'
  });

});

// ============================================
// /connecter sans argument
// ============================================
bot.onText(/^\/connecter$/, (msg) => {
  bot.sendMessage(msg.chat.id, `
❌ *𝕹𝖚𝖒é𝖗𝖔 𝖒𝖆𝖓𝖖𝖚𝖆𝖓𝖙 !*

📌 *𝖀𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖎𝖔𝖓 :*
\`/connecter +221XXXXXXXX\`

💡 *𝔼𝕩𝖊𝖒𝖕𝖑𝖊𝖘 :*
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
    return bot.sendMessage(chatId, '❌ *𝕹𝖚𝖒é𝖗𝖔 𝖎𝖓𝖛𝖆𝖑𝖎𝖉𝖊 !*\n\n𝔼𝕩𝖊𝖒𝖕𝖑𝖊 : /connecter +221XXXXXXXX', { parse_mode: 'Markdown' });
  }

  if (getSession(userId)) {
    return bot.sendMessage(chatId, '⚠️ *𝖁𝖔𝖚𝖘 ê𝖙𝖊𝖘 𝖉é𝖏à 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é !*\n\n𝖀𝖙𝖎𝖑𝖎𝖘𝖊𝖟 /deconnecter 𝖉\'𝖆𝖇𝖔𝖗𝖉.', { parse_mode: 'Markdown' });
  }

  const loadingMsg = await bot.sendMessage(chatId, `⏳ *𝕲é𝖓é𝖗𝖆𝖙𝖎𝖔𝖓 𝖉𝖚 𝖈𝖔𝖉𝖊 𝖕𝖆𝖎𝖗𝖎𝖓𝖌 𝖕𝖔𝖚𝖗 +${phone}...*\n\n_𝖁𝖊𝖚𝖎𝖑𝖑𝖊𝖟 𝖕𝖆𝖙𝖎𝖊𝖓𝖙𝖊𝖗 5 𝖘𝖊𝖈𝖔𝖓𝖉𝖊𝖘..._`, { parse_mode: 'Markdown' });

  try {
    await connectWhatsApp(
      userId,
      phone,
      async (code, error) => {
        if (error || !code) {
          await bot.editMessageText(
            `❌ *𝔼𝕣𝖗𝖊𝖚𝖗 :*\n${error || '𝕮𝖔𝖉𝖊 𝖓𝖔𝖓 𝖗𝖊çu'}\n\n𝕽é𝖊𝖘𝖘𝖆𝖞𝖊𝖟 𝖆𝖛𝖊𝖈 /connecter +${phone}`,
            { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
          );
          return;
        }
        await bot.editMessageText(
          `╔══════════════════════╗\n║   🔑 *𝕮𝖔𝖉𝖊 𝕻𝖆𝖎𝖗𝖎𝖓𝖌*    ║\n╚══════════════════════╝\n\n*𝖁𝖔𝖙𝖗𝖊 𝖈𝖔𝖉𝖊 :*\n\`${code}\`\n\n📱 *𝕮𝖔𝖒𝖒𝖊𝖓𝖙 𝖑'𝖚𝖙𝖎𝖑𝖎𝖘𝖊𝖗 :*\n1️⃣ 𝕺𝖚𝖛𝖗𝖊𝖟 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕\n2️⃣ 𝕻𝖆𝖗𝖆𝖒è𝖙𝖗𝖊𝖘 → 𝕬𝖕𝖕𝖆𝖗𝖊𝖎𝖑𝖘 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é𝖘\n3️⃣ 𝕮𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝖚𝖓 𝖆𝖕𝖕𝖆𝖗𝖊𝖎𝖑\n4️⃣ 𝕮𝖔𝖓𝖓𝖊𝖈𝖙𝖊𝖗 𝖆𝖛𝖊𝖈 𝖓𝖚𝖒é𝖗𝖔\n5️⃣ 𝔼𝖓𝖙𝖗𝖊𝖟 𝖑𝖊 𝖈𝖔𝖉𝖊\n\n⏰ *𝔼𝖝𝖕𝖎𝖗𝖊 𝖉𝖆𝖓𝖘 60 𝖘𝖊𝖈𝖔𝖓𝖉𝖊𝖘 !*`,
          { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
        );
      },
      async (sock) => {
        await bot.sendMessage(chatId, `✅ *𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é !*\n\n📱 *𝕹𝖚𝖒é𝖗𝖔 :* +${phone}\n\n𝕿𝖆𝖕𝖊𝖟 *.menu* 𝖘𝖚𝖗 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕 !`, { parse_mode: 'Markdown' });
      },
      (sock, msg, uid) => {
        handleWAMessage(sock, msg, uid, bot);
      }
    );
  } catch (err) {
    await bot.editMessageText(
      `❌ *𝔼𝖗𝖗𝖊𝖚𝖗 :* ${err.message}`,
      { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
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
    return bot.sendMessage(chatId, `❌ *𝖁𝖔𝖚𝖘 𝖓'ê𝖙𝖊𝖘 𝖕𝖆𝖘 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é !*\n\n𝖀𝖙𝖎𝖑𝖎𝖘𝖊𝖟 /connecter +221XXXXXXXX`, { parse_mode: 'Markdown' });
  }

  try { await session.logout(); } catch (e) {}
  removeSession(userId);

  const sessionDir = path.join(__dirname, '../session', userId);
  try { fs.rmSync(sessionDir, { recursive: true, force: true }); } catch (e) {}

  bot.sendMessage(chatId, '✅ *𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕 𝖉é𝖈𝖔𝖓𝖓𝖊𝖈𝖙é 𝖆𝖛𝖊𝖈 𝖘𝖚𝖈𝖈è𝖘 !*', { parse_mode: 'Markdown' });
});

// ============================================
// /status
// ============================================
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const session = getSession(userId);

  if (session) {
    bot.sendMessage(chatId, `✅ *𝕾𝖙𝖆𝖙𝖚𝖙 : 𝕮𝖔𝖓𝖓𝖊𝖈𝖙é*\n\n𝕿𝖆𝖕𝖊𝖟 *.menu* 𝖘𝖚𝖗 𝖂𝖍𝖆𝖙𝖘𝕬𝖕𝖕.`, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, `❌ *𝕾𝖙𝖆𝖙𝖚𝖙 : 𝕹𝖔𝖓 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é*\n\n𝖀𝖙𝖎𝖑𝖎𝖘𝖊𝖟 /connecter +XXXXXXXXXXX`, { parse_mode: 'Markdown' });
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
  await bot.sendMessage(chatId, `🔐 *𝕻𝖆𝖓𝖊𝖑 𝕬𝖉𝖒𝖎𝖓*\n\n𝔼𝖓𝖙𝖗𝖊𝖟 𝖑𝖊 𝖒𝖔𝖙 𝖉𝖊 𝖕𝖆𝖘𝖘𝖊 :`, { parse_mode: 'Markdown' });
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
      await bot.sendMessage(chatId, '✅ *𝕬𝖈𝖈è𝖘 𝖆𝖈𝖈𝖔𝖗𝖉é !*', { parse_mode: 'Markdown' });
      return sendAdminPanel(chatId);
    } else {
      return bot.sendMessage(chatId, '❌ *𝕸𝖔𝖙 𝖉𝖊 𝖕𝖆𝖘𝖘𝖊 𝖎𝖓𝖈𝖔𝖗𝖗𝖊𝖈𝖙 !*\n\n𝕽é𝖊𝖘𝖘𝖆𝖞𝖊𝖟 𝖆𝖛𝖊𝖈 /admin', { parse_mode: 'Markdown' });
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
        await sock.sendMessage(ownNumber, { text: `📢 *𝕸𝖊𝖘𝖘𝖆𝖌𝖊 𝖉𝖚 𝕺𝖜𝖓𝖊𝖗 :*\n\n${text}` });
        count++;
      } catch (e) {}
    }
    await bot.sendMessage(chatId, `✅ *𝕭𝖗𝖔𝖆𝖉𝖈𝖆𝖘𝖙 𝖊𝖓𝖛𝖔𝖞é à ${count} 𝖚𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗𝖘 !*`, { parse_mode: 'Markdown' });
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
    await bot.answerCallbackQuery(query.id, { text: '🔍 𝖁é𝖗𝖎𝖋𝖎𝖈𝖆𝖙𝖎𝖔𝖓 𝖊𝖓 𝖈𝖔𝖚𝖗𝖘...', show_alert: false });

    const notJoined = await checkUserJoined(userId);

    if (notJoined.length > 0) {
      const list = notJoined.map(c => `❌ ${c.name}`).join('\n');
      return bot.sendMessage(chatId, `
⚠️ *𝖁𝖔𝖚𝖘 𝖓'𝖆𝖛𝖊𝖟 𝖕𝖆𝖘 𝖊𝖓𝖈𝖔𝖗𝖊 𝖙𝖔𝖚𝖙 𝖗𝖊𝖏𝖔𝖎𝖓𝖙 !*

*𝕮𝖆𝖓𝖆𝖚𝖝 𝖒𝖆𝖓𝖖𝖚𝖆𝖓𝖙𝖘 :*
${list}

👇 *𝕽𝖊𝖏𝖔𝖎𝖓𝖊𝖟-𝖑𝖊𝖘 𝖉'𝖆𝖇𝖔𝖗𝖉 𝖕𝖚𝖎𝖘 𝖈𝖑𝖎𝖖𝖚𝖊𝖟 𝖘𝖚𝖗 ✅*
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            ...notJoined.map(c => ([{ text: c.name, url: c.link }])),
            [{ text: '✅ 𝕵\'𝖆𝖎 𝖗𝖊𝖏𝖔𝖎𝖓𝖙 𝖙𝖔𝖚𝖘 𝖑𝖊𝖘 𝖈𝖆𝖓𝖆𝖚𝖝 !', callback_data: 'check_joined' }]
          ]
        }
      });
    }

    confirmedUsers.add(userId);
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) {}
    await bot.sendMessage(chatId, '✅ *𝕸𝖊𝖗𝖈𝖎 𝖉\'𝖆𝖛𝖔𝖎𝖗 𝖗𝖊𝖏𝖔𝖎𝖓𝖙 ! 𝕭𝖎𝖊𝖓𝖛𝖊𝖓𝖚𝖊 !* 🎉', { parse_mode: 'Markdown' });
    return sendMainMenu(chatId);
  }

  // ===== PANEL ADMIN =====
  if (!adminSessions.has(userId)) {
    return bot.answerCallbackQuery(query.id, { text: '❌ 𝕬𝖈𝖈è𝖘 𝖗𝖊𝖋𝖚𝖘é !', show_alert: true });
  }

  await bot.answerCallbackQuery(query.id);

  if (data === 'admin_stats') {
    await bot.sendMessage(chatId, `📊 *𝕾𝖙𝖆𝖙𝖎𝖘𝖙𝖎𝖖𝖚𝖊𝖘*\n\n👥 𝕾𝖊𝖘𝖘𝖎𝖔𝖓𝖘 : ${getAllSessions().size}\n🚫 𝕭𝖆𝖓𝖓𝖎𝖘 : ${bannedUsers.size}\n⏱️ 𝖀𝖕𝖙𝖎𝖒𝖊 : ${formatUptime(process.uptime())}\n💻 𝕽𝕬𝕸 : ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, { parse_mode: 'Markdown' });

  } else if (data === 'admin_users') {
    const sessions = getAllSessions();
    if (sessions.size === 0) {
      await bot.sendMessage(chatId, '❌ *𝕬𝖚𝖈𝖚𝖓 𝖚𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é !*', { parse_mode: 'Markdown' });
    } else {
      let list = '👥 *𝖀𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗𝖘 𝖈𝖔𝖓𝖓𝖊𝖈𝖙é𝖘 :*\n\n';
      let i = 1;
      for (const [uid, sock] of sessions) {
        const num = sock.user?.id?.split(':')[0] || '𝕴𝖓𝖈𝖔𝖓𝖓𝖚';
        list += `${i}. 📱 +${num} (ID: ${uid})\n`;
        i++;
      }
      await bot.sendMessage(chatId, list, { parse_mode: 'Markdown' });
    }

  } else if (data === 'admin_broadcast') {
    broadcastWaiting.set(userId, true);
    await bot.sendMessage(chatId, '📢 *𝔼𝖓𝖙𝖗𝖊𝖟 𝖑𝖊 𝖒𝖊𝖘𝖘𝖆𝖌𝖊 à 𝖇𝖗𝖔𝖆𝖉𝖈𝖆𝖘𝖙𝖊𝖗 :*', { parse_mode: 'Markdown' });

  } else if (data === 'admin_restart') {
    await bot.sendMessage(chatId, '🔄 *𝕽𝖊𝖉é𝖒𝖆𝖗𝖗𝖆𝖌𝖊 𝖉𝖚 𝖇𝖔𝖙...*', { parse_mode: 'Markdown' });
    setTimeout(() => process.exit(0), 1000);

  } else if (data === 'admin_ban') {
    await bot.sendMessage(chatId, '🚫 *𝔼𝖓𝖙𝖗𝖊𝖟 𝖑\'𝕴𝕯 𝕿𝖊𝖑𝖊𝖌𝖗𝖆𝖒 à 𝖇𝖆𝖓𝖓𝖎𝖗 :*', { parse_mode: 'Markdown' });
    bot.once('message', async (m) => {
      if (m.chat.id === chatId) {
        bannedUsers.add(m.text);
        await bot.sendMessage(chatId, `✅ *𝖀𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗 ${m.text} 𝖇𝖆𝖓𝖓𝖎 !*`, { parse_mode: 'Markdown' });
      }
    });

  } else if (data === 'admin_unban') {
    await bot.sendMessage(chatId, '✅ *𝔼𝖓𝖙𝖗𝖊𝖟 𝖑\'𝕴𝕯 𝕿𝖊𝖑𝖊𝖌𝖗𝖆𝖒 à 𝖉é𝖇𝖆𝖓𝖓𝖎𝖗 :*', { parse_mode: 'Markdown' });
    bot.once('message', async (m) => {
      if (m.chat.id === chatId) {
        bannedUsers.delete(m.text);
        await bot.sendMessage(chatId, `✅ *𝖀𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗 ${m.text} 𝖉é𝖇𝖆𝖓𝖓𝖎 !*`, { parse_mode: 'Markdown' });
      }
    });

  } else if (data === 'admin_banlist') {
    if (bannedUsers.size === 0) {
      await bot.sendMessage(chatId, '✅ *𝕬𝖚𝖈𝖚𝖓 𝖚𝖙𝖎𝖑𝖎𝖘𝖆𝖙𝖊𝖚𝖗 𝖇𝖆𝖓𝖓𝖎 !*', { parse_mode: 'Markdown' });
    } else {
      let list = '🚫 *𝕷𝖎𝖘𝖙𝖊 𝖉𝖊𝖘 𝖇𝖆𝖓𝖓𝖎𝖘 :*\n\n';
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
    await bot.sendMessage(chatId, `✅ *${count} 𝖘𝖊𝖘𝖘𝖎𝖔𝖓𝖘 𝖉é𝖈𝖔𝖓𝖓𝖊𝖈𝖙é𝖊𝖘 !*`, { parse_mode: 'Markdown' });

  } else if (data === 'admin_logout') {
    adminSessions.delete(userId);
    await bot.sendMessage(chatId, '🚪 *𝕻𝖆𝖓𝖊𝖑 𝖆𝖉𝖒𝖎𝖓 𝖋𝖊𝖗𝖒é !*', { parse_mode: 'Markdown' });
  }
});

// Gestion erreurs polling
bot.on('polling_error', (err) => {
  console.error('❌ Telegram polling error:', err.message);
});

console.log('✅ 𝕭𝖔𝖙 𝕿𝖊𝖑𝖊𝖌𝖗𝖆𝖒 𝖉é𝖒𝖆𝖗𝖗é 𝖆𝖛𝖊𝖈 𝖘𝖚𝖈𝖈è𝖘 !');

module.exports = bot;
