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
// FORCE SUBSCRIBE - CANAUX ET GROUPES
// ============================================
const REQUIRED_CHANNELS = [
  {
    name: '📢 Canal Officiel',
    link: 'https://t.me/+dxH_OGPd269mMjM0',
    id: -1004410224011
  },
  {
    name: '👥 Groupe Officiel',
    link: 'https://t.me/+Le-FgJipb-UyMDY0',
    id: -1004407166762
  }
];

// Stocker les utilisateurs qui ont confirmé
const confirmedUsers = new Set();

// ============================================
// VÉRIFICATION RÉELLE SI L'UTILISATEUR A REJOINT
// ============================================
async function checkUserJoined(userId) {
  for (const channel of REQUIRED_CHANNELS) {
    try {
      const member = await bot.getChatMember(channel.id, userId);
      const status = member.status;
      // Si l'utilisateur n'est pas membre
      if (status === 'left' || status === 'kicked' || status === 'banned') {
        return false;
      }
    } catch (e) {
      console.error(`Erreur vérification canal ${channel.name}:`, e.message);
      return false;
    }
  }
  return true; // A rejoint tous les canaux
}

// Envoyer le message Force Subscribe
async function sendForceSubscribe(chatId) {
  const channelList = REQUIRED_CHANNELS.map((c, i) => `${i + 1}. ${c.name}`).join('\n');

  await bot.sendMessage(chatId, `
╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 *𝑫𝑬𝑽 𝑺𝑯𝑨𝑫𝑶𝑾 𝑴𝑫 𝑩𝑶𝑻*  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

⚠️ *Pour utiliser ce bot, vous devez rejoindre:*

${channelList}

👇 *Cliquez sur les boutons ci-dessous pour rejoindre !*
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        ...REQUIRED_CHANNELS.map(c => ([{
          text: c.name,
          url: c.link
        }])),
        [{
          text: '✅ J\'ai rejoint tous les canaux !',
          callback_data: 'check_joined'
        }]
      ]
    }
  });
}

// Afficher le menu principal Telegram
async function sendMainMenu(chatId) {
  await bot.sendVideo(
    chatId,
    'https://files.catbox.moe/vw6pys.mp4',
    {
      caption: `
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
      `,
      parse_mode: 'Markdown'
    }
  );
}

// ============================================
// /start
// ============================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Si déjà confirmé, afficher le menu directement
  if (confirmedUsers.has(userId)) {
    return sendMainMenu(chatId);
  }

  // Sinon envoyer le Force Subscribe
  await sendForceSubscribe(chatId);
});

// ============================================
// CALLBACK - Bouton "J'ai rejoint"
// ============================================
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data === 'check_joined') {
    await bot.answerCallbackQuery(query.id, {
      text: '🔍 Vérification en cours...',
      show_alert: false
    });

    // Vérification réelle si l'utilisateur a rejoint les canaux
    const joined = await checkUserJoined(userId);

    if (!joined) {
      // L'utilisateur n'a pas encore rejoint
      await bot.answerCallbackQuery(query.id, {
        text: '❌ Vous n\'avez pas encore rejoint tous les canaux !',
        show_alert: true
      });
      return;
    }

    // Marquer comme confirmé
    confirmedUsers.add(userId);

    // Supprimer le message précédent
    try {
      await bot.deleteMessage(chatId, query.message.message_id);
    } catch (e) {}

    // Afficher le menu principal
    await sendMainMenu(chatId);
  }
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
    return bot.sendMessage(chatId, '❌ Numéro invalide !\n\nExemple: /connecter +221XXXXXXXX');
  }

  // Vérifier si déjà connecté
  if (getSession(userId)) {
    return bot.sendMessage(chatId, '⚠️ Vous êtes déjà connecté !\n\nUtilisez /deconnecter d\'abord.');
  }

  const loadingMsg = await bot.sendMessage(chatId, `⏳ Génération du code pairing pour *+${phone}*...\n\n_Veuillez patienter 5 secondes..._`, { parse_mode: 'Markdown' });

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
║   🔑 CODE PAIRING    ║
╚══════════════════════╝

*Votre code:*
\`${code}\`

📱 *Comment l'utiliser:*
1️⃣ Ouvrez WhatsApp
2️⃣ Allez dans ⚙️ *Paramètres*
3️⃣ Appuyez sur *Appareils connectés*
4️⃣ Appuyez sur *Connecter un appareil*
5️⃣ Choisissez *Connecter avec numéro*
6️⃣ Entrez le code ci-dessus

⏰ *Le code expire dans 60 secondes !*`,
          { chat_id: chatId, message_id: loadingMsg.message_id, parse_mode: 'Markdown' }
        );
      },

      // Callback: connexion réussie
      async (sock) => {
        await bot.sendMessage(chatId, `
✅ *WhatsApp connecté avec succès !*

📱 Numéro: +${phone}
🤖 Bot: ${BOT_NAME}

Maintenant allez sur WhatsApp et tapez:
*.menu* pour voir toutes les commandes !
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
