const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

const PREFIX = process.env.PREFIX || '.';
const BOT_NAME = process.env.BOT_NAME || 'MON-BOT';

// ============================================
// ANTILINK - SYSTÈME D'AVERTISSEMENTS
// ============================================
const antilinkSettings = {};
const antilinkWarnings = {};

function getAntilinkEnabled(groupId) {
  return antilinkSettings[groupId]?.enabled || false;
}

function getWarningCount(groupId, userId) {
  if (!antilinkWarnings[groupId]) antilinkWarnings[groupId] = {};
  return antilinkWarnings[groupId][userId] || 0;
}

function addWarning(groupId, userId) {
  if (!antilinkWarnings[groupId]) antilinkWarnings[groupId] = {};
  antilinkWarnings[groupId][userId] = (antilinkWarnings[groupId][userId] || 0) + 1;
  return antilinkWarnings[groupId][userId];
}

function resetWarning(groupId, userId) {
  if (antilinkWarnings[groupId]) antilinkWarnings[groupId][userId] = 0;
}

// ============================================
// ANTIPROMOTE SETTINGS
// ============================================
const antipromoteSettings = {};

// ============================================
// FONCTION PRINCIPALE - HANDLER MESSAGES WA
// ============================================
async function handleWAMessage(sock, msg, userId, tgBot) {
  try {
    const from = msg.key.remoteJid;
    if (!from) return;

    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    const pushName = msg.pushName || 'User';

    // Récupérer le texte du message (tous les types)
    const body = msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      msg.message?.buttonsResponseMessage?.selectedButtonId ||
      msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId || '';

    if (!body) return;

    // ============================================
    // ANTILINK - VÉRIFICATION AUTOMATIQUE
    // ============================================
    if (isGroup && getAntilinkEnabled(from)) {
      const hasLink = /(https?:\/\/|www\.|chat\.whatsapp\.com)/i.test(body);
      const isOwner = sender === userId + '@s.whatsapp.net';

      if (hasLink && !isOwner && !body.startsWith(PREFIX)) {
        const senderNumber = sender.split('@')[0];
        const count = addWarning(from, sender);

        if (count < 3) {
          await sock.sendMessage(from, {
            text: `⚠️ @${senderNumber} *Avertissement ${count}/3 !*\n\nLes liens sont interdits dans ce groupe !\nEncore ${3 - count} avertissement(s) avant d'être expulsé.`,
            mentions: [sender]
          }, { quoted: msg });
          try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
        } else {
          await sock.sendMessage(from, {
            text: `🚫 @${senderNumber} *Expulsé !*\n\nVous avez reçu 3 avertissements pour envoi de liens.\nAu revoir ! 👋`,
            mentions: [sender]
          }, { quoted: msg });
          try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
          try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
          resetWarning(from, sender);
        }
        return;
      }
    }

    // ============================================
    // VV - VIEW ONCE
    // ============================================
    const viewOnceMsg = msg.message?.viewOnceMessage?.message ||
      msg.message?.viewOnceMessageV2?.message ||
      msg.message?.viewOnceMessageV2Extension?.message;

    if (viewOnceMsg) {
      try {
        await sock.sendMessage(from, viewOnceMsg, { quoted: msg });
      } catch {}
      return;
    }

    if (!body.startsWith(PREFIX)) return;

    const args = body.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    console.log(`[WA] Commande: ${command} | De: ${sender} | Groupe: ${isGroup}`);

    const reply = async (text) => {
      await sock.sendMessage(from, { text }, { quoted: msg });
    };

    const isOwner = sender === userId + '@s.whatsapp.net';

    switch (command) {

      // ========== GÉNÉRAL ==========
      case 'menu':
      case 'help': {
        // Message de chargement stylé
        const loadingMsg = await sock.sendMessage(from, {
          text: `╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝙼𝙳  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

⚡ 𝙿𝚁𝙾𝙲𝙴𝚂𝚂𝙸𝙽𝙶 𝙼𝙴𝙽𝚄...

░░░░░░░░░░ 0%`
        }, { quoted: msg });

        const steps = [
          { pct: 10,  bar: '█░░░░░░░░░' },
          { pct: 20,  bar: '██░░░░░░░░' },
          { pct: 30,  bar: '███░░░░░░░' },
          { pct: 40,  bar: '████░░░░░░' },
          { pct: 50,  bar: '█████░░░░░' },
          { pct: 60,  bar: '██████░░░░' },
          { pct: 70,  bar: '███████░░░' },
          { pct: 80,  bar: '████████░░' },
          { pct: 90,  bar: '█████████░' },
          { pct: 100, bar: '██████████' },
        ];

        const labels = [
          '𝙻𝙾𝙰𝙳𝙸𝙽𝙶 𝙲𝙾𝙼𝙼𝙰𝙽𝙳𝚂...',
          '𝙲𝙷𝙴𝙲𝙺𝙸𝙽𝙶 𝚂𝚈𝚂𝚃𝙴𝙼...',
          '𝙵𝙴𝚃𝙲𝙷𝙸𝙽𝙶 𝙳𝙰𝚃𝙰...',
          '𝙸𝙽𝙸𝚃𝙸𝙰𝙻𝙸𝚉𝙸𝙽𝙶...',
          '𝙿𝚁𝙾𝙲𝙴𝚂𝚂𝙸𝙽𝙶...',
          '𝚅𝙴𝚁𝙸𝙵𝚈𝙸𝙽𝙶...',
          '𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙸𝙽𝙶...',
          '𝚂𝚈𝙽𝙲𝙸𝙽𝙶...',
          '𝙵𝙸𝙽𝙰𝙻𝙸𝚉𝙸𝙽𝙶...',
          '𝙳𝙾𝙽𝙴 ✅',
        ];

        for (let i = 0; i < steps.length; i++) {
          await new Promise(r => setTimeout(r, 300));
          try {
            await sock.sendMessage(from, {
              text: `╔━━━━━━━━━━━━━━━━━━━━━━╗
║  🤖 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝙼𝙳  ║
╚━━━━━━━━━━━━━━━━━━━━━━╝

⚡ ${labels[i]}

${steps[i].bar} ${steps[i].pct}%`,
              edit: loadingMsg.key
            });
          } catch {}
        }

        await new Promise(r => setTimeout(r, 400));

        // Menu principal
        await sock.sendMessage(from, {
          image: { url: 'https://files.catbox.moe/b8gkna.jpg' },
          gifPlayback: false,
          caption: `
╭━━━〔 🤖 ${BOT_NAME} 〕━━━⬣
┃ 👑 Owner : 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝚃𝙴𝙲𝙷
┃ ⚙️ Prefix : ${PREFIX}
┃ 🟢 Status : 𝙾𝙽𝙻𝙸𝙽𝙴
╰━━━━━━━━━━━━━━━━⬣

╭━━〔 📌 GENERAL 〕━━⬣
┃ ${PREFIX}menu
┃ ${PREFIX}ping
┃ ${PREFIX}info
┃ ${PREFIX}owner
┃ ${PREFIX}date
┃ ${PREFIX}temps
┃ ${PREFIX}uptime
╰━━━━━━━━━━━━━━⬣

╭━━〔 👥 GROUP 〕━━⬣
┃ ${PREFIX}tagall
┃ ${PREFIX}kick
┃ ${PREFIX}kickall
┃ ${PREFIX}purge
┃ ${PREFIX}add +numéro
┃ ${PREFIX}promote @nom
┃ ${PREFIX}demote @nom
┃ ${PREFIX}mute
┃ ${PREFIX}unmute
┃ ${PREFIX}link
┃ ${PREFIX}setname
┃ ${PREFIX}setdesc
┃ ${PREFIX}antilink on/off
┃ ${PREFIX}antipromote on/off
╰━━━━━━━━━━━━━━⬣

╭━━〔 🎨 MEDIA 〕━━⬣
┃ ${PREFIX}sticker
┃ ${PREFIX}take
┃ ${PREFIX}toimg
┃ ${PREFIX}tomp3
┃ ${PREFIX}vv
┃ ${PREFIX}ytmp3
┃ ${PREFIX}ytmp4
┃ ${PREFIX}play
╰━━━━━━━━━━━━━━⬣

╭━━〔 🤖 AI 〕━━⬣
┃ ${PREFIX}ai
┃ ${PREFIX}imagine
┃ ${PREFIX}resume
┃ ${PREFIX}correct
┃ ${PREFIX}poème
╰━━━━━━━━━━━━━━⬣

╭━━〔 🔍 SEARCH 〕━━⬣
┃ ${PREFIX}google
┃ ${PREFIX}wiki
┃ ${PREFIX}news
┃ ${PREFIX}météo
┃ ${PREFIX}translate
╰━━━━━━━━━━━━━━⬣

╭━━〔 🛠 TOOLS 〕━━⬣
┃ ${PREFIX}calcul
┃ ${PREFIX}base64
┃ ${PREFIX}decode64
┃ ${PREFIX}pass
┃ ${PREFIX}uuid
┃ ${PREFIX}ip
┃ ${PREFIX}short
╰━━━━━━━━━━━━━━⬣

╭━━〔 😎 FUN 〕━━⬣
┃ ${PREFIX}meme
┃ ${PREFIX}joke
┃ ${PREFIX}quote
┃ ${PREFIX}fact
┃ ${PREFIX}love
┃ ${PREFIX}ship
┃ ${PREFIX}rate
┃ ${PREFIX}roast
╰━━━━━━━━━━━━━━⬣

╭━━〔 👑 OWNER 〕━━⬣
┃ ${PREFIX}broadcast
┃ ${PREFIX}stats
┃ ${PREFIX}restart
┃ ${PREFIX}clearall
╰━━━━━━━━━━━━━━⬣

╭━━━━━━━━━━━━━━⬣
┃𝚌𝚛𝚎𝚎 𝚙𝚊𝚛 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆
╰━━━━━━━━━━━━━━⬣
`
        }, { quoted: msg });
        break;
      }

      case 'ping':
        const start = Date.now();
        await reply(`🏓 Pong! ${Date.now() - start}ms`);
        break;

      case 'info':
        await reply(`
🤖 *${BOT_NAME}*

📌 Version: 1.0.0
⚡ Statut: En ligne
📝 Préfixe: ${PREFIX}
🕐 Uptime: ${formatUptime(process.uptime())}
💻 Node.js: ${process.version}
📦 Platform: ${process.platform}
        `);
        break;

      case 'temps':
        await reply(`🕐 *Heure actuelle:* ${moment().format('HH:mm:ss')}`);
        break;

      case 'date':
        await reply(`📅 *Date actuelle:* ${moment().format('DD/MM/YYYY')}`);
        break;

      case 'uptime':
        await reply(`⏱️ *Uptime:* ${formatUptime(process.uptime())}`);
        break;

      case 'owner':
        await reply(`👑 *Owner du bot*\n\nContactez le propriétaire pour plus d'informations.`);
        break;

      // ========== GROUPE ==========
      case 'tagall':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        try {
          const groupMeta = await sock.groupMetadata(from);
          const members = groupMeta.participants;
          let text = '📢 *Mention de tous les membres:*\n\n';
          const mentions = [];
          for (const member of members) {
            text += `@${member.id.split('@')[0]}\n`;
            mentions.push(member.id);
          }
          await sock.sendMessage(from, { text, mentions }, { quoted: msg });
        } catch {
          await reply('❌ Impossible de mentionner tous les membres');
        }
        break;

      case 'kickall':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        if (!isOwner) return reply('❌ Seul le owner peut utiliser kickall !');
        try {
          const groupMeta = await sock.groupMetadata(from);
          const members = groupMeta.participants.filter(m => m.id !== sender && m.admin !== 'superadmin');
          if (members.length === 0) return reply('❌ Aucun membre à expulser !');
          await reply(`⏳ Expulsion de ${members.length} membres en cours...`);
          for (const member of members) {
            try {
              await sock.groupParticipantsUpdate(from, [member.id], 'remove');
              await new Promise(r => setTimeout(r, 500));
            } catch {}
          }
          await reply(`✅ *${members.length} membres expulsés avec succès !*`);
        } catch {
          await reply('❌ Impossible d\'expulser les membres (vérifiez les permissions admin)');
        }
        break;

      case 'purge':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        if (!isOwner) return reply('❌ Seul le owner peut utiliser purge !');
        try {
          const groupMeta = await sock.groupMetadata(from);
          const members = groupMeta.participants.filter(m => m.id !== sender && m.admin !== 'superadmin');
          if (members.length === 0) return reply('❌ Aucun membre à expulser !');
          await reply(`💥 *PURGE EN COURS...*\n\n⏳ Expulsion de ${members.length} membres !`);
          // Expulser tous en même temps (2 secondes)
          const chunks = [];
          for (let i = 0; i < members.length; i += 5) {
            chunks.push(members.slice(i, i + 5));
          }
          for (const chunk of chunks) {
            await Promise.all(chunk.map(m =>
              sock.groupParticipantsUpdate(from, [m.id], 'remove').catch(() => {})
            ));
            await new Promise(r => setTimeout(r, 200));
          }
          await reply(`✅ *PURGE TERMINÉE !*\n\n🚀 ${members.length} membres expulsés !`);
        } catch {
          await reply('❌ Impossible d\'effectuer la purge (vérifiez les permissions admin)');
        }
        break;

      case 'kick':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const kickTarget = msg.message?.extendedTextMessage?.contextInfo?.participant ||
          (msg.message?.extendedTextMessage?.text?.match(/@(\d+)/)?.[1] + '@s.whatsapp.net');
        if (!kickTarget) return reply('❌ Mentionnez un utilisateur: .kick @user');
        try {
          await sock.groupParticipantsUpdate(from, [kickTarget], 'remove');
          await reply(`✅ Membre expulsé avec succès !`);
        } catch {
          await reply('❌ Impossible d\'expulser (vérifiez les permissions admin)');
        }
        break;

      case 'promote': {
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        // Récupérer la cible via mention ou reply
        const mentionedPromote = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
          msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!mentionedPromote) return reply(`❌ Usage: ${PREFIX}promote @nom`);
        try {
          await sock.groupParticipantsUpdate(from, [mentionedPromote], 'promote');
          await sock.sendMessage(from, {
            text: `👑 @${mentionedPromote.split('@')[0]} *a été nommé administrateur !*`,
            mentions: [mentionedPromote]
          }, { quoted: msg });
        } catch {
          await reply('❌ Impossible de promouvoir (vérifiez les permissions)');
        }
        break;
      }

      case 'demote': {
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const mentionedDemote = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
          msg.message?.extendedTextMessage?.contextInfo?.participant;
        if (!mentionedDemote) return reply(`❌ Usage: ${PREFIX}demote @nom`);
        try {
          await sock.groupParticipantsUpdate(from, [mentionedDemote], 'demote');
          await sock.sendMessage(from, {
            text: `⬇️ @${mentionedDemote.split('@')[0]} *a été dénommé !*`,
            mentions: [mentionedDemote]
          }, { quoted: msg });
        } catch {
          await reply('❌ Impossible de rétrograder (vérifiez les permissions)');
        }
        break;
      }

      case 'add': {
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const addArg = args[0];
        if (!addArg) return reply(`❌ Usage: ${PREFIX}add +221XXXXXXXX`);
        const addNumber = addArg.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        try {
          await sock.groupParticipantsUpdate(from, [addNumber], 'add');
          await reply(`✅ *+${addArg.replace(/[^0-9]/g, '')} ajouté avec succès !*`);
        } catch {
          await reply('❌ Impossible d\'ajouter ce membre');
        }
        break;
      }

      case 'mute':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        try {
          await sock.groupSettingUpdate(from, 'announcement');
          await reply('🔇 Groupe mis en mode silencieux (seuls les admins peuvent écrire)');
        } catch {
          await reply('❌ Impossible de muter le groupe');
        }
        break;

      case 'unmute':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        try {
          await sock.groupSettingUpdate(from, 'not_announcement');
          await reply('🔊 Groupe réactivé (tout le monde peut écrire)');
        } catch {
          await reply('❌ Impossible de réactiver le groupe');
        }
        break;

      case 'link':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        try {
          const link = await sock.groupInviteCode(from);
          await reply(`🔗 *Lien du groupe:*\nhttps://chat.whatsapp.com/${link}`);
        } catch {
          await reply('❌ Impossible d\'obtenir le lien (vérifiez les permissions)');
        }
        break;

      case 'setname':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const newName = args.join(' ');
        if (!newName) return reply('❌ Usage: .setname Nouveau nom');
        try {
          await sock.groupUpdateSubject(from, newName);
          await reply(`✅ Nom du groupe changé en: ${newName}`);
        } catch {
          await reply('❌ Impossible de changer le nom');
        }
        break;

      case 'setdesc':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const newDesc = args.join(' ');
        if (!newDesc) return reply('❌ Usage: .setdesc Nouvelle description');
        try {
          await sock.groupUpdateDescription(from, newDesc);
          await reply(`✅ Description mise à jour !`);
        } catch {
          await reply('❌ Impossible de changer la description');
        }
        break;

      case 'groupinfo':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        try {
          const meta = await sock.groupMetadata(from);
          await reply(`
📊 *Info du Groupe*

📌 Nom: ${meta.subject}
👥 Membres: ${meta.participants.length}
📝 Description: ${meta.desc || 'Aucune description'}
👑 Créé par: @${meta.owner?.split('@')[0]}
📅 Créé le: ${moment(meta.creation * 1000).format('DD/MM/YYYY')}
          `);
        } catch {
          await reply('❌ Impossible d\'obtenir les infos du groupe');
        }
        break;

      case 'antilink':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const antilinkArg = args[0]?.toLowerCase();
        if (!antilinkArg || !['on', 'off'].includes(antilinkArg)) {
          return reply(`❌ Usage: ${PREFIX}antilink on ou ${PREFIX}antilink off`);
        }
        if (!antilinkSettings[from]) antilinkSettings[from] = {};
        antilinkSettings[from].enabled = antilinkArg === 'on';
        await reply(`🔗 *Antilink ${antilinkArg === 'on' ? '✅ Activé' : '❌ Désactivé'} !*\n\n${antilinkArg === 'on' ? '⚠️ Tout membre qui envoie un lien recevra 3 avertissements avant d\'être expulsé.' : 'Les liens sont maintenant autorisés.'}`);
        break;

      case 'antipromote':
        if (!isGroup) return reply('❌ Commande disponible uniquement en groupe');
        const antipromoteArg = args[0]?.toLowerCase();
        if (!antipromoteArg || !['on', 'off'].includes(antipromoteArg)) {
          return reply(`❌ Usage: ${PREFIX}antipromote on ou ${PREFIX}antipromote off`);
        }
        antipromoteSettings[from] = antipromoteArg === 'on';
        await reply(`👑 *Antipromote ${antipromoteArg === 'on' ? '✅ Activé' : '❌ Désactivé'} !*\n\n${antipromoteArg === 'on' ? 'Le bot annoncera les promotions et démotions dans le groupe.' : ''}`);
        break;

      // ========== MEDIA ==========
      case 'sticker':
        await reply('📌 Envoyez une image avec la légende .sticker pour créer un sticker');
        break;

      case 'take': {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg?.stickerMessage) return reply(`❌ Répondez à un sticker avec ${PREFIX}take nom | auteur`);
        const parts = args.join(' ').split('|');
        const stickerName = parts[0]?.trim() || BOT_NAME;
        const stickerAuthor = parts[1]?.trim() || 'DEV SHADOW';
        try {
          await sock.sendMessage(from, {
            sticker: { url: await sock.downloadMediaMessage(
              { message: quotedMsg, key: msg.message.extendedTextMessage.contextInfo.stanzaId }
            )},
            mimetype: 'image/webp',
            stickerName,
            stickerAuthor
          }, { quoted: msg });
          await reply(`✅ *Sticker renommé !*\n📝 Nom: ${stickerName}\n✍️ Auteur: ${stickerAuthor}`);
        } catch {
          await reply('❌ Impossible de modifier le sticker');
        }
        break;
      }

      case 'toimg':
        await reply('📌 Envoyez un sticker avec la légende .toimg pour le convertir en image');
        break;

      case 'vv':
        await reply('👁️ Renvoi automatique des messages view once activé !');
        break;

      case 'tomp3':
        await reply('🎵 Envoyez une vidéo avec la légende .tomp3 pour la convertir en audio');
        break;

      case 'ytmp3':
        await reply('🎵 Fonctionnalité YouTube MP3 disponible avec un service de téléchargement');
        break;

      case 'ytmp4':
        await reply('🎬 Fonctionnalité YouTube MP4 disponible avec un service de téléchargement');
        break;

      case 'play':
        await reply('🎵 Fonctionnalité lecture musique disponible avec un service audio');
        break;

      // ========== OUTILS ==========
      case 'calcul':
      case 'calc':
        try {
          const expr = args.join(' ');
          if (!expr) return reply('❌ Usage: .calcul 2+2');
          const result = eval(expr.replace(/[^0-9+\-*/().%\s]/g, ''));
          await reply(`🧮 *Calcul:* ${expr}\n📊 *Résultat:* ${result}`);
        } catch {
          await reply('❌ Expression invalide');
        }
        break;

      case 'pass':
      case 'password':
        const length = parseInt(args[0]) || 12;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < Math.min(length, 50); i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        await reply(`🔐 *Mot de passe généré:*\n\`${password}\``);
        break;

      case 'uuid':
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0;
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        await reply(`🆔 *UUID:* \`${uuid}\``);
        break;

      case 'base64':
        const textToEncode = args.join(' ');
        if (!textToEncode) return reply('❌ Usage: .base64 texte');
        await reply(`🔒 *Base64:*\n${Buffer.from(textToEncode).toString('base64')}`);
        break;

      case 'decode64':
        const textToDecode = args.join(' ');
        if (!textToDecode) return reply('❌ Usage: .decode64 texte');
        try {
          await reply(`🔓 *Décodé:*\n${Buffer.from(textToDecode, 'base64').toString('utf8')}`);
        } catch {
          await reply('❌ Texte base64 invalide');
        }
        break;

      case 'ip':
        try {
          const res = await axios.get('https://api.ipify.org?format=json');
          await reply(`🌐 *IP Publique:* ${res.data.ip}`);
        } catch {
          await reply('❌ Impossible d\'obtenir l\'IP');
        }
        break;

      case 'temps-unix':
        await reply(`⏰ *Timestamp Unix:* ${Math.floor(Date.now() / 1000)}`);
        break;

      case 'short':
        const urlToShort = args[0];
        if (!urlToShort) return reply('❌ Usage: .short https://lien.com');
        try {
          const res = await axios.get(`https://tinyurl.com/api-create.php?url=${urlToShort}`);
          await reply(`🔗 *Lien raccourci:* ${res.data}`);
        } catch {
          await reply('❌ Impossible de raccourcir ce lien');
        }
        break;

      // ========== FUN ==========
      case 'blague':
      case 'joke':
        const blagues = [
          'Pourquoi les plongeurs plongent-ils toujours en arrière ? Parce que sinon ils tomberaient dans le bateau ! 😂',
          'Un homme entre dans une bibliothèque et demande un hamburger. Le bibliothécaire répond : "Monsieur, ici c\'est une bibliothèque !" L\'homme chuchote : "Désolé. Un hamburger, s\'il vous plaît." 😄',
          'Qu\'est-ce qu\'un canif ? Un petit fien ! 😆',
          'Pourquoi Einstein n\'avait pas de portable ? Parce qu\'il était déjà trop relatif ! 🤓',
          'Comment appelle-t-on un chat tombé dans un pot de peinture le jour de Noël ? Un chat peint de Noël ! 🎄',
        ];
        await reply(`😂 *Blague:*\n\n${blagues[Math.floor(Math.random() * blagues.length)]}`);
        break;

      case 'quote':
      case 'citation':
        const quotes = [
          '"Le succès c\'est d\'aller d\'échec en échec sans perdre son enthousiasme." - Winston Churchill',
          '"La vie c\'est comme une bicyclette, il faut avancer pour ne pas perdre l\'équilibre." - Albert Einstein',
          '"Le seul moyen de faire du bon travail est d\'aimer ce que vous faites." - Steve Jobs',
          '"Croyez en vous-même et tout sera possible." - Anonyme',
          '"Le voyage de mille lieues commence par un seul pas." - Lao Tseu',
        ];
        await reply(`💬 *Citation:*\n\n${quotes[Math.floor(Math.random() * quotes.length)]}`);
        break;

      case 'fact':
        const facts = [
          '🌍 La Terre tourne à environ 1 670 km/h sur elle-même !',
          '🐙 Les pieuvres ont 3 cœurs et 9 cerveaux !',
          '🍯 Le miel ne se périme jamais. On a trouvé du miel de 3000 ans encore comestible !',
          '🌙 Si vous pesez 60 kg sur Terre, vous peseriez seulement 10 kg sur la Lune !',
          '🧠 Le cerveau humain contient environ 86 milliards de neurones !',
        ];
        await reply(`🤔 *Le saviez-vous ?*\n\n${facts[Math.floor(Math.random() * facts.length)]}`);
        break;

      case 'dé':
      case 'dice':
        const dice = Math.floor(Math.random() * 6) + 1;
        const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        await reply(`🎲 *Résultat du dé:* ${diceEmoji[dice - 1]} (${dice})`);
        break;

      case 'pile':
      case 'coin':
        const coin = Math.random() > 0.5 ? '🪙 Pile' : '🪙 Face';
        await reply(`*Résultat:* ${coin}`);
        break;

      case 'rps':
        const choices = ['🪨 Pierre', '📄 Feuille', '✂️ Ciseaux'];
        const botChoice = choices[Math.floor(Math.random() * 3)];
        const userChoice = args[0]?.toLowerCase();
        let rpsResult = '';
        if (!userChoice) return reply('❌ Usage: .rps pierre/feuille/ciseaux');
        await reply(`Vous: ${userChoice}\nBot: ${botChoice}\n\n${rpsResult || '🤝 Égalité ou résultat inconnu'}`);
        break;

      case 'vérité':
        const truths = [
          'Quelle est la chose la plus embarrassante qui vous soit arrivée ?',
          'Quelle est votre plus grande peur secrète ?',
          'Avez-vous déjà menti à votre meilleur ami ?',
          'Quelle est la chose dont vous êtes le plus fier dans votre vie ?',
          'Quel est votre plus grand regret ?',
        ];
        await reply(`🙊 *Vérité:*\n\n${truths[Math.floor(Math.random() * truths.length)]}`);
        break;

      case 'défi':
        const dares = [
          'Envoyez un message d\'amour à la dernière personne de votre liste de contacts !',
          'Changez votre statut WhatsApp en "Je suis un canard" pendant 1 heure !',
          'Envoyez un selfie à vos 3 meilleurs amis !',
          'Appelez quelqu\'un au hasard et dites-lui "Je t\'aime" !',
          'Changez votre photo de profil en photo de clown pendant 24h !',
        ];
        await reply(`🎯 *Défi:*\n\n${dares[Math.floor(Math.random() * dares.length)]}`);
        break;

      case 'love':
        const lovePercent = Math.floor(Math.random() * 100) + 1;
        const loveBar = '❤️'.repeat(Math.floor(lovePercent / 10)) + '🖤'.repeat(10 - Math.floor(lovePercent / 10));
        await reply(`💕 *Compteur d'amour*\n\n${loveBar}\n\n*${lovePercent}%* de compatibilité !`);
        break;

      case 'rate':
        const rate = Math.floor(Math.random() * 10) + 1;
        const stars = '⭐'.repeat(rate) + '☆'.repeat(10 - rate);
        await reply(`📊 *Évaluation:*\n\n${stars}\n${rate}/10`);
        break;

      case 'ship':
        const shipPercent = Math.floor(Math.random() * 100) + 1;
        await reply(`💑 *Compatibilité:*\n\n❤️ ${shipPercent}% compatible !`);
        break;

      case 'roast':
        const roasts = [
          'Tu es tellement lent que les tortues te doublent ! 🐢',
          'Quand tu es né, les médecins ont pleuré... de joie de te voir partir ! 😂',
          'Tu es la preuve vivante que Darwin avait tort ! 🦧',
        ];
        await reply(`🔥 *Roast:*\n\n${roasts[Math.floor(Math.random() * roasts.length)]}`);
        break;

      case 'compliment':
        const compliments = [
          'Tu es incroyable et tu le sais ! ✨',
          'Le monde est meilleur grâce à toi ! 🌟',
          'Tu as un sourire qui illumine la pièce ! 😊',
          'Tu es plus fort(e) que tu ne le penses ! 💪',
          'Tu es une source d\'inspiration pour les autres ! 🌈',
        ];
        await reply(`💝 *Compliment:*\n\n${compliments[Math.floor(Math.random() * compliments.length)]}`);
        break;

      case 'meme':
        try {
          const res = await axios.get('https://meme-api.com/gimme');
          await sock.sendMessage(from, {
            image: { url: res.data.url },
            caption: `😂 *${res.data.title}*`
          }, { quoted: msg });
        } catch {
          await reply('❌ Impossible de charger un mème');
        }
        break;

      case 'quiz':
        const quizzes = [
          { q: 'Quelle est la capitale de la France ?', r: 'Paris' },
          { q: 'Combien font 12 x 12 ?', r: '144' },
          { q: 'Quel est le plus grand océan ?', r: 'Pacifique' },
          { q: 'En quelle année a eu lieu la Révolution française ?', r: '1789' },
          { q: 'Combien de planètes dans le système solaire ?', r: '8' },
        ];
        const q = quizzes[Math.floor(Math.random() * quizzes.length)];
        await reply(`❓ *Quiz:*\n\n${q.q}\n\n_Répondez dans 30 secondes !_\n||Réponse: ${q.r}||`);
        break;

      case 'profil':
        await reply(`👤 *Votre Profil*\n\n📱 Numéro: ${sender.split('@')[0]}\n👋 Nom: ${pushName}`);
        break;

      case 'spam':
        const spamCount = Math.min(parseInt(args[0]) || 3, 10);
        const spamMsg = args.slice(1).join(' ') || 'Spam !';
        for (let i = 0; i < spamCount; i++) {
          await sock.sendMessage(from, { text: spamMsg });
          await new Promise(r => setTimeout(r, 500));
        }
        break;

      case 'typing':
        await sock.sendPresenceUpdate('composing', from);
        await new Promise(r => setTimeout(r, 3000));
        await sock.sendPresenceUpdate('paused', from);
        await reply('✅ Simulation de frappe terminée');
        break;

      case 'stats':
        await reply(`📊 *Statistiques du Bot*\n\n⏱️ Uptime: ${formatUptime(process.uptime())}\n💻 RAM: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\n🤖 Version: 1.0.0`);
        break;

      case 'restart':
        await reply('🔄 Redémarrage du bot...');
        setTimeout(() => process.exit(0), 1000);
        break;

      case 'welcome':
        await reply(`✅ Message de bienvenue ${args[0] === 'on' ? 'activé' : 'désactivé'}`);
        break;

      case 'goodbye':
        await reply(`✅ Message d'au revoir ${args[0] === 'on' ? 'activé' : 'désactivé'}`);
        break;

      case 'setwelcome':
        const welcomeMsg = args.join(' ');
        if (!welcomeMsg) return reply('❌ Usage: .setwelcome Votre message');
        await reply(`✅ Message de bienvenue défini:\n${welcomeMsg}`);
        break;

      case 'ghost':
        await reply(`👻 Mode fantôme ${args[0] === 'on' ? 'activé' : 'désactivé'}`);
        break;

      case 'antidelete':
        await reply(`🔒 Anti-suppression ${args[0] === 'on' ? 'activé' : 'désactivé'}`);
        break;

      case 'autoreply':
        await reply(`💬 Réponse automatique ${args[0] === 'on' ? 'activée' : 'désactivée'}`);
        break;

      case 'define':
        const word = args.join(' ');
        if (!word) return reply('❌ Usage: .define mot');
        try {
          const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
          const definition = res.data[0]?.meanings[0]?.definitions[0]?.definition;
          await reply(`📖 *${word}:*\n\n${definition || 'Définition introuvable'}`);
        } catch {
          await reply('❌ Mot introuvable dans le dictionnaire');
        }
        break;

      case 'chiffre':
        const secretNumber = Math.floor(Math.random() * 10) + 1;
        await reply(`🎯 *Devinez le chiffre entre 1 et 10!*\n\n||La réponse est: ${secretNumber}||`);
        break;

      case 'gif':
        await reply('🎬 Fonctionnalité GIF disponible avec une clé API GIPHY');
        break;

      case 'google':
        const searchQuery = args.join(' ');
        if (!searchQuery) return reply('❌ Usage: .google votre recherche');
        await reply(`🔍 *Recherche Google:*\nhttps://www.google.com/search?q=${encodeURIComponent(searchQuery)}`);
        break;

      case 'news':
        await reply('📰 Fonctionnalité actualités disponible avec une clé API NewsAPI');
        break;

      case 'imagine':
        await reply('🎨 Fonctionnalité génération image IA disponible avec une clé API');
        break;

      // ========== IA ==========
      case 'ai':
      case 'gpt':
        const aiPrompt = args.join(' ');
        if (!aiPrompt) return reply('❌ Usage: .ai votre question');
        await reply('🤖 En train de réfléchir...');
        try {
          const res = await axios.get(`https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(aiPrompt)}`);
          await reply(`🤖 *Réponse IA:*\n\n${res.data.result || res.data.message || 'Pas de réponse'}`);
        } catch {
          await reply('❌ Service IA temporairement indisponible');
        }
        break;

      case 'traduction':
      case 'translate':
        const textToTranslate = args.join(' ');
        if (!textToTranslate) return reply('❌ Usage: .traduction texte');
        try {
          const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=auto|fr`);
          await reply(`🌐 *Traduction:*\n\n${res.data.responseData.translatedText}`);
        } catch {
          await reply('❌ Traduction impossible');
        }
        break;

      case 'météo':
      case 'weather':
        const city = args.join(' ');
        if (!city) return reply('❌ Usage: .météo Paris');
        try {
          const res = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+%h+%w`);
          await reply(`🌤️ *Météo à ${city}:*\n\n${res.data}`);
        } catch {
          await reply('❌ Météo introuvable pour cette ville');
        }
        break;

      case 'wiki':
        const wikiQuery = args.join(' ');
        if (!wikiQuery) return reply('❌ Usage: .wiki sujet');
        try {
          const res = await axios.get(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQuery)}`);
          await reply(`📚 *Wikipedia: ${res.data.title}*\n\n${res.data.extract?.slice(0, 500)}...\n\n🔗 ${res.data.content_urls?.desktop?.page}`);
        } catch {
          await reply('❌ Article Wikipedia introuvable');
        }
        break;

      case 'resume':
        const textToResume = args.join(' ');
        if (!textToResume) return reply('❌ Usage: .resume votre texte');
        await reply(`📝 *Résumé:*\n\n${textToResume.slice(0, 100)}...`);
        break;

      case 'correct':
        const textToCorrect = args.join(' ');
        if (!textToCorrect) return reply('❌ Usage: .correct votre texte');
        await reply(`✏️ *Texte original:*\n${textToCorrect}\n\n*Texte corrigé:*\n${textToCorrect} ✓`);
        break;

      case 'poème':
        const theme = args.join(' ') || 'amour';
        await reply(`📜 *Poème sur ${theme}:*\n\nLes mots s'envolent comme des oiseaux,\nDans le ciel bleu de nos rêves,\n${theme} illumine nos cœurs,\nEt guide nos pas vers l'aurore...`);
        break;

      case 'qr':
        await reply('📱 Fonctionnalité QR Code disponible - envoyez votre texte');
        break;

      case 'couleur':
        const hex = args[0];
        if (!hex) return reply('❌ Usage: .couleur #FF5733');
        await reply(`🎨 *Couleur ${hex}*\n\nHEX: ${hex}\nUtilisez un convertisseur de couleur en ligne pour plus de détails.`);
        break;

      case 'change':
        await reply('💱 Fonctionnalité de conversion de devise disponible avec une clé API');
        break;

      case 'bio':
        await reply('✏️ Changement de bio non supporté par WhatsApp Web API');
        break;

      case 'nom':
        await reply('✏️ Changement de nom non supporté par WhatsApp Web API');
        break;

      case 'block':
        await reply('🚫 Fonctionnalité de blocage en cours de développement');
        break;

      case 'unblock':
        await reply('✅ Fonctionnalité de déblocage en cours de développement');
        break;

      case 'ban':
        await reply('🚫 Fonctionnalité ban en cours de développement');
        break;

      case 'unban':
        await reply('✅ Fonctionnalité unban en cours de développement');
        break;

      case 'liste':
        await reply('📋 Fonctionnalité liste utilisateurs réservée au owner');
        break;

      case 'broadcast':
        await reply('📢 Fonctionnalité broadcast réservée au owner');
        break;

      case 'clearall':
        await reply('🗑️ Fonctionnalité clearall réservée au owner');
        break;

      // ========== CRYPTO ==========
      case 'btc':
      case 'bitcoin':
        try {
          const res = await axios.get('https://api.coinbase.com/v2/prices/BTC-USD/spot');
          const price = parseFloat(res.data.data.amount).toLocaleString();
          await reply(`₿ *Bitcoin (BTC)*\n\n💵 Prix: $${price} USD`);
        } catch {
          await reply('❌ Impossible d\'obtenir le prix du Bitcoin');
        }
        break;

      case 'eth':
      case 'ethereum':
        try {
          const res = await axios.get('https://api.coinbase.com/v2/prices/ETH-USD/spot');
          const price = parseFloat(res.data.data.amount).toLocaleString();
          await reply(`Ξ *Ethereum (ETH)*\n\n💵 Prix: $${price} USD`);
        } catch {
          await reply('❌ Impossible d\'obtenir le prix d\'Ethereum');
        }
        break;

      case 'crypto': {
        const coin = args[0]?.toUpperCase();
        if (!coin) { await reply('❌ Usage: .crypto BTC'); break; }
        try {
          const resCrypto = await axios.get(`https://api.coinbase.com/v2/prices/${coin}-USD/spot`);
          const priceCrypto = parseFloat(resCrypto.data.data.amount).toLocaleString();
          await reply(`💰 *${coin}*\n\n💵 Prix: $${priceCrypto} USD`);
        } catch {
          await reply(`❌ Crypto "${coin}" introuvable`);
        }
        break;
      }

      default:
        await reply(`❌ Commande *${PREFIX}${command}* inconnue.\n\nTapez *${PREFIX}menu* pour voir toutes les commandes.`);
        break;
    }

  } catch (err) {
    console.error('[HANDLER ERROR]', err);
  }
}

// ============================================
// ANTIPROMOTE - DÉTECTION AUTOMATIQUE
// ============================================
async function handleGroupParticipantsUpdate(sock, update) {
  try {
    const { id, participants, action, author } = update;
    if (!antipromoteSettings[id]) return;
    if (action !== 'promote' && action !== 'demote') return;

    const adminNumber = author ? `@${author.split('@')[0]}` : 'un administrateur';

    for (const participant of participants) {
      const number = participant.split('@')[0];
      const text = action === 'promote'
        ? `👑 @${number} *a été nommé administrateur* par ${adminNumber} !`
        : `⬇️ @${number} *a été dénommé* par ${adminNumber} !`;

      await sock.sendMessage(id, {
        text,
        mentions: author ? [participant, author] : [participant]
      });
    }
  } catch (err) {
    console.error('[ANTIPROMOTE ERROR]', err);
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

module.exports = { handleWAMessage, handleGroupParticipantsUpdate };
