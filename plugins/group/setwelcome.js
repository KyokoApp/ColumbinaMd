let handler = async (m, { conn, text, usedPrefix, command }) => {
    const chat = global.db?.data?.chats?.[m.chat] || {}

    if (command === 'delwelcome') {
        delete chat.sWelcome
        return m.reply('✅ Custom pesan welcome telah dihapus (kembali ke pesan default).')
    }

    const welcomeText = text || m.quoted?.text || ''
    if (!welcomeText) {
        return m.reply(
            `Ketik pesan welcome yang diinginkan!\n\n` +
            `*Placeholder yang bisa digunakan:*\n` +
            `• \`@user\` : Tag member baru\n` +
            `• \`@subject\` : Nama grup\n` +
            `• \`@desc\` : Deskripsi grup\n\n` +
            `_Contoh:_ *${usedPrefix + command} Selamat datang @user di @subject! Jangan lupa baca deskripsi ya.*`
        )
    }

    chat.sWelcome = welcomeText
    // Otomatis aktifkan fitur welcome bila belum
    chat.welcome = true

    await m.reply(`✅ Pesan sambutan (welcome) berhasil diatur dan diaktifkan!`)
}

handler.help = ['setwelcome <teks>', 'delwelcome']
handler.tags = ['group']
handler.command = /^(setwelcome|delwelcome)$/i
handler.group = true
handler.admin = true

export default handler
