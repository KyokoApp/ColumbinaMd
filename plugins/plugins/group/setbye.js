let handler = async (m, { conn, text, usedPrefix, command }) => {
    const chat = global.db?.data?.chats?.[m.chat] || {}

    if (command === 'delbye') {
        delete chat.sBye
        return m.reply('✅ Custom pesan keluar (bye) telah dihapus (kembali ke pesan default).')
    }

    const byeText = text || m.quoted?.text || ''
    if (!byeText) {
        return m.reply(
            `Ketik pesan perpisahan yang diinginkan!\n\n` +
            `*Placeholder yang bisa digunakan:*\n` +
            `• \`@user\` : Tag member yang keluar\n` +
            `• \`@subject\` : Nama grup\n\n` +
            `_Contoh:_ *${usedPrefix + command} Selamat tinggal @user dari @subject! Semoga harimu menyenangkan.*`
        )
    }

    chat.sBye = byeText
    chat.welcome = true

    await m.reply(`✅ Pesan perpisahan (bye) berhasil diatur dan diaktifkan!`)
}

handler.help = ['setbye <teks>', 'delbye']
handler.tags = ['group']
handler.command = /^(setbye|delbye)$/i
handler.group = true
handler.admin = true

export default handler
