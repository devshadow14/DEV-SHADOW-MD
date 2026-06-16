// =============================================
// BOT WHATSAPP + TELEGRAM - DEV SHADOW MD BOT
// =============================================

// Installer dotenv si pas présent
try { require('dotenv').config(); } catch(e) {}

const path = require('path');
const fs = require('fs');

// Variables d'environnement (si pas de .env, utiliser les variables système)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OWNER_ID = process.env.OWNER_TELEGRAM_ID;
const BOT_NAME = process.env.BOT_NAME || 'DEV SHADOW MD BOT';
const PREFIX = process.env.PREFIX || '.';

console.log(`
╔══════════════════════════════╗
║   🤖 DEV SHADOW MD BOT       ║
║      Démarrage en cours...   ║
╚══════════════════════════════╝
`);

if (!TELEGRAM_TOKEN) {
  console.error('❌ TELEGRAM_TOKEN manquant !');
  console.error('👉 Ajoutez TELEGRAM_TOKEN dans les variables d\'environnement');
  process.exit(1);
}

// Créer le dossier session si inexistant
const sessionDir = path.join(__dirname, 'session');
if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

// Démarrer le bot Telegram
require('./telegram/bot');

console.log('✅ Bot Telegram démarré !');
console.log('📱 En attente de connexions WhatsApp...');
console.log(`🤖 Nom du bot: ${BOT_NAME}`);
console.log(`📌 Préfixe: ${PREFIX}`);

// Reconnexion automatique des sessions sauvegardées
async function reconnectSavedSessions() {
  try {
    const { connectWhatsApp } = require('./lib/connect');
    const { handleWAMessage } = require('./commands/handler');

    if (!fs.existsSync(sessionDir)) return;
    const users = fs.readdirSync(sessionDir);

    for (const userId of users) {
      const userSessionDir = path.join(sessionDir, userId);
      if (fs.statSync(userSessionDir).isDirectory()) {
        console.log(`🔄 Reconnexion session: ${userId}`);
        try {
          await connectWhatsApp(
            userId,
            null,
            null,
            (sock) => console.log(`✅ Session ${userId} reconnectée !`),
            (sock, msg, uid) => handleWAMessage(sock, msg, uid, null)
          );
        } catch (err) {
          console.log(`❌ Reconnexion échouée pour ${userId}: ${err.message}`);
        }
      }
    }
  } catch (err) {
    console.log('📂 Aucune session sauvegardée');
  }
}

reconnectSavedSessions();

// Gestion des erreurs
process.on('uncaughtException', (err) => {
  console.error('❌ Erreur:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Rejeté:', err?.message || err);
});
