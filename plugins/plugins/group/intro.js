let handler = async (m, { conn, text, usedPrefix, command, isAdmin }) => {
    const chat = global.db?.data?.chats?.[m.chat] || {}

    // Perintah melihat intro (.intro)
    if (command === 'intro') {
        if (!chat.intro) {
            return m.reply(`Belum ada teks intro di grup ini.\nAdmin grup bisa mengatur intro dengan mengetik:\n*${usedPrefix}setintro <teks intro>*`)
        }
        return m.reply(`📋 *INTRO / ATURAN GRUP*\n\n${chat.intro}`)
    }

    // Perintah hapus intro (.delintro)
    if (command === 'delintro') {
        if (!isAdmin) return m.reply('❌ Hanya Admin grup yang dapat menghapus intro!')
        if (!chat.intro) return m.reply('Intro grup memang belum diatur.')
        delete chat.intro
        return m.reply('✅ Intro grup berhasil dihapus.')
    }

    // Perintah mengatur intro (.setintro)
    if (command === 'setintro') {
        if (!isAdmin) return m.reply('❌ Hanya Admin grup yang dapat mengatur intro!')
        const introText = text || m.quoted?.text || ''
        if (!introText) {
            return m.reply(`Gunakan format:\n*${usedPrefix}setintro <teks intro atau biodata>*\n\nAtau reply pesan teks dengan *${usedPrefix}setintro*`)
        }

        chat.intro = introText
        return m.reply(`✅ Berhasil menyimpan intro grup!\nKetik *${usedPrefix}intro* untuk melihatnya.`)
    }
}

handler.help = ['intro', 'setintro <teks>', 'delintro']
handler.tags = ['group']
handler.command = /^(intro|setintro|delintro)$/i
handler.group = true

export default handler
