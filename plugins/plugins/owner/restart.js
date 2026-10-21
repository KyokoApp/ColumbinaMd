let handler = async (m, { conn }) => {
    await m.reply('🔄 Merestart bot...')
    process.exit(0)
}

handler.help = ['restart']
handler.tags = ['owner']
handler.command = /^(restart|reboot)$/i
handler.owner = true

export default handler
