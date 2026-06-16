const TelegramBot = require('node-telegram-bot-api');
const { connectWhatsApp, getSession, removeSession } = require('../lib/connect');
const { handleWAMessage } = require('../commands/handler');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
const BOT_NAME = process.env.BOT_NAME || 'DEV SHADOW MD BOT';

if (!TOKEN) {
  console.error('❌ TELEGRAM_TOKEN manquant !');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ============================================
// /start
// ============================================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendVideo(
    chatId,
    'https://files.catbox.moe/vw6pys.mp4', // Remplace par ton lien video
    {
      caption: `╔═══════════════════════════╗
║   🤖 ${BOT_NAME}
╚═══════════════════════════╝

👋 𝙷𝙴𝚈 𝙱𝙸𝙴𝙽𝚅𝙴𝙽𝚄𝙴 𝙳𝙰𝙽𝚂 𝙻𝙴 𝙱𝙾𝚃 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆

📱 *𝙻𝙴𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝙴𝚂 :*

🔗 /connecter +221XXXXXXXX
→ 𝙶𝙴𝙽𝙴𝚁𝙴 𝚄𝙽 𝙲𝙾𝙳𝙴 𝙳𝙴 𝙲𝙾𝙽𝙽𝙴𝚇𝙸𝙾𝙽

❌ /deconnecter
→ 𝙳𝙴𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴 𝙻𝙴 𝙱𝙾𝚃

📊 /status
→ 𝚅𝙾𝙸𝚁 𝙻'𝙴𝚃𝙰𝚃 𝙳𝙴 𝚅𝙾𝚃𝚁𝙴 𝙲𝙾𝙽𝙽𝙴𝚇𝙸𝙾𝙽

━━━━━━━━━━━━━━━━━━━━━━

✅ 𝙰𝙿𝚁𝙴̀𝚂 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙸𝙾𝙽,
📖 𝚃𝙰𝙿𝙴 *.menu* 𝚂𝚄𝚁 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿

━━━━━━━━━━━━━━━━━━━━━━
🐉 Powered By DEV SHADOW TECH`,
      parse_mode: 'Markdown'
    }
  );
});

// ============================================
// /connecter
// ============================================
bot.onText(/\/connecter (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const input = match[1].trim();
  const phone = input.replace(/[^0-9]/g, '');

  if (!phone || phone.length < 10) {
    return bot.sendMessage(chatId, '❌ 𝙽𝚄𝙼𝙴𝚁𝙾 𝙸𝙽𝚅𝙰𝙻𝙸𝙳𝙴 !\n\nExemple: /connecter +221XXXXXXXX');
  }

  // Vérifier si déjà connecté
  if (getSession(userId)) {
    return bot.sendMessage(chatId, '⚠️ 𝚅𝙾𝚄𝚂 𝙴𝚃𝙴𝚂 𝙳𝙴𝙹𝙰 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴𝚁 !\n\n𝚃𝙰𝙿𝙴 /deconnecter 𝙳\'𝙰𝙱𝙾𝚁𝙳.');
  }

  const loadingMsg = await bot.sendMessage(chatId, `⏳ 𝙶𝙴𝙽𝙴𝚁𝙰𝚃𝙸𝙾𝙽 𝙳𝚄 𝙲𝙾𝙳𝙴 𝙳𝙴 𝙲𝙾𝙽𝙽𝙴𝚇𝙸𝙾𝙽 𝙿𝙾𝚄𝚁 *+${phone}*...\n\n_𝚅𝙴𝙸𝙻𝙻𝙴𝚉 𝙿𝙰𝚃𝙸𝙴𝙽𝚃𝙴𝚉 𝙳𝙰𝙽𝚂 5 𝚂𝙴𝙲𝙾𝙽𝙳𝙴𝚂..._`, { parse_mode: 'Markdown' });

  try {
    await connectWhatsApp(
      userId,
      phone,

      // Callback: code pairing reçu
      async (code, error) => {
        if (error || !code) {
          await bot.editMessageText(
            `❌ Erreur lors de la génération du code:\n${error || 'Code non reçu'}\n\nRéessayez avec /connecter +${phone}`,
            { chat_id: chatId, message_id: loadingMsg.message_id }
          );
          return;
        }

        await bot.editMessageText(
          `╔══════════════════════╗
║   🔑 𝙲𝙾𝙳𝙴 𝙿𝙰𝙸𝚁𝙸𝙽𝙶 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆    ║
╚══════════════════════╝

*Votre code:*
\`${code}\`

📱 *𝐂𝐨𝐦𝐦𝐞𝐧𝐭 𝐥'𝐮𝐭𝐢𝐥𝐢𝐬𝐞𝐫:*
1️⃣ 𝙾𝚄𝚅𝚁𝙴𝚉 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿
2️⃣ 𝙰𝙻𝙻𝙴𝚉 𝙳𝙰𝙽𝚂 ⚙️ *Paramètres*
3️⃣ 𝙰𝙿𝙿𝚄𝚈𝙴𝚁 𝚂𝚄𝚁 *Appareils connectés*
4️⃣ 𝙰𝙿𝙿𝚄𝚈𝙴𝚁 𝚂𝚄𝚁 *Connecter un appareil*
5️⃣ 𝙲𝙷𝙾𝙸𝚂𝙸𝚂𝚂𝙴𝚉 *Connecter avec numéro*
6️⃣ 𝙴𝙽𝚃𝚁𝙴𝚉 𝙻𝙴 𝙲𝙾𝙳𝙴 𝙲𝙸-𝙳𝙴𝚂𝚂𝙾𝚄𝚂

⏰ *𝙻𝙴 𝙲𝙾𝙳𝙴 𝙴𝚇𝙿𝙸𝚁𝙴 𝙳𝙰𝙽𝚂 2 𝙼𝙸𝙽𝚄𝚃𝙴𝚂 !*`,
          { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
        );
      },

      // Callback: connexion réussie
      async (sock) => {
        await bot.sendMessage(chatId, `
✅ *𝙱𝙾𝚃 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴 𝙰𝚅𝙴𝙲 𝚂𝚄𝙲𝙲𝙴𝚂 !*

📱 Numéro: +${phone}
🤖 Bot: ${BOT_NAME}

𝙼𝙰𝙸𝙽𝚃𝙴𝙽𝙰𝙽𝚃 𝙰𝙻𝙻𝙴𝚉 𝚂𝚄𝚁 𝚆𝙷𝙰𝚃𝚂𝙰𝙿𝙿 𝙴𝚃 𝚃𝙰𝙿𝙴:
*.menu* 𝙿𝙾𝚄𝚁 𝚅𝙾𝙸𝚁 𝙻𝙴𝚂 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂 !
        `, { parse_mode: 'Markdown' });
      },

      // Callback: message WhatsApp reçu
      (sock, msg, uid) => {
        handleWAMessage(sock, msg, uid, bot);
      }
    );
  } catch (err) {
    await bot.editMessageText(
      `❌ Erreur: ${err.message}\n\nRéessayez avec /connecter +${phone}`,
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
    return bot.sendMessage(chatId, '❌ Vous n\'êtes pas connecté.');
  }

  try {
    await session.logout();
  } catch (e) {}

  removeSession(userId);

  // Supprimer les fichiers de session
  const sessionDir = path.join(__dirname, '../session', userId);
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch (e) {}

  bot.sendMessage(chatId, '✅ *WhatsApp déconnecté avec succès !*\n\nUtilisez /connecter pour vous reconnecter.', { parse_mode: 'Markdown' });
});

// ============================================
// /status
// ============================================
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const session = getSession(userId);

  if (session) {
    bot.sendMessage(chatId, `✅ *Statut: Connecté*\n\n🤖 Bot actif et prêt !\nTapez *.menu* sur WhatsApp.`, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, `❌ *Statut: Non connecté*\n\nUtilisez /connecter +XXXXXXXXXXX`, { parse_mode: 'Markdown' });
  }
});

// ============================================
// /owner (réservé au propriétaire)
// ============================================
bot.onText(/\/owner/, (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);

  if (userId !== String(OWNER_ID)) {
    return bot.sendMessage(chatId, '❌ Commande réservée au propriétaire.');
  }

  const { getAllSessions } = require('../lib/connect');
  const total = getAllSessions().size;

  bot.sendMessage(chatId, `
👑 *Panel Owner - ${BOT_NAME}*

👥 Sessions actives: ${total}
⚙️ Version: 1.0.0
  `, { parse_mode: 'Markdown' });
});

// Gestion erreurs polling
bot.on('polling_error', (err) => {
  console.error('❌ Telegram polling error:', err.message);
});

console.log('✅ Bot Telegram démarré avec succès !');

module.exports = bot;
