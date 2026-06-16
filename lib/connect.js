await sock.sendMessage(ownNumber, {
  image: {
    url: 'https://files.catbox.moe/okx3hc.jpg' // Remplace par ton lien image
  },
  caption: `╔═━━━『 🤖 ${BOT_NAME} 』━━━═╗

      ✅ 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝙼𝙳 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴́

╠═══════════════════════╣
👑 𝙾𝚆𝙽𝙴𝚁 : +${sock.user?.id?.split(':')[0]}
⚡ 𝚂𝚃𝙰𝚃𝚄𝚂 : Online
🕐 𝙷𝙴𝚄𝚁𝙴 : ${new Date().toLocaleTimeString()}
📅 𝙳𝙰𝚃𝙴 : ${new Date().toLocaleDateString()}
╠═══════════════════════╣

📖 𝚃𝙰𝙿𝙴 : ${PREFIX}menu

╠═══════════════════════╣
🔥 𝙱𝙾𝚃 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝙼𝙳
🚀 𝙲𝙾𝙽𝙽𝙴𝙲𝚃𝙴𝚁 À 𝚃𝙾𝚄𝚂 𝙼𝙾𝙼𝙴𝙽𝚃
💎 Powered By 𝙳𝙴𝚅 𝚂𝙷𝙰𝙳𝙾𝚆 𝚃𝙴𝙲𝙷
╚═══════════════════════╝`
});