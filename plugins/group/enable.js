let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isOwner }) => {
    const isEnable = /^(on|enable)$/i.test(command)
    const chat = global.db?.data?.chats?.[m.chat] || {}

    const type = (args[0] || '').toLowerCase()

    // Daftar fitur yang dapat di-toggle
    const featureList = ['antilink', 'antifoto', 'antividio']

    // Jika tidak ada argumen, tampilkan daftar status fitur dalam teks biasa (tanpa tombol)
    if (!type || !featureList.includes(type)) {
        let text = `⚙️ *PENGATURAN GRUP*\n\n`
        text += `┌─ ✦ *STATUS FITUR*\n`
        text += `│ • antilink : [ ${chat.antilink ? 'ON ✅' : 'OFF ❌'} ]\n`
        text += `│ • antifoto : [ ${chat.antifoto ? 'ON ✅' : 'OFF ❌'} ]\n`
        text += `│ • antividio : [ ${chat.antividio ? 'ON ✅' : 'OFF ❌'} ]\n`
        text += `└────\n\n`
        text += `📌 *Format Penggunaan:*\n`
        text += `• \`${usedPrefix}on <nama-fitur>\`\n`
        text += `• \`${usedPrefix}off <nama-fitur>\`\n\n`
        text += `_Contoh: *${usedPrefix}on antilink*_`

        return m.reply(text)
    }

    if (chat[type] === isEnable) {
        return m.reply(`ℹ️ Fitur *${type}* sudah dalam kondisi *${isEnable ? 'ON' : 'OFF'}*.`)
    }

    // Ubah status fitur di database
    chat[type] = isEnable
    await m.reply(`✅ Fitur *${type}* berhasil di-*${isEnable ? 'aktifkan (ON)' : 'nonaktifkan (OFF)'}*.`)
}

handler.help = ['on <fitur>', 'off <fitur>']
handler.tags = ['group']
handler.command = /^(on|off|enable|disable)$/i
handler.group = true
handler.admin = true

export default handler
