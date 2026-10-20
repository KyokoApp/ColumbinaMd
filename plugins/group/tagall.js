let handler = async (m, { conn, text, participants }) => {
    const list = participants || []
    let pesan = text ? `\n_Pesan: ${text}_\n` : ''

    let teks = `📢 *TAG ALL MEMBER*\n${pesan}\n`
    for (let i = 0; i < list.length; i++) {
        teks += `${i + 1}. @${list[i].id.split('@')[0]}\n`
    }

    await conn.sendMessage(m.chat, {
        text: teks,
        mentions: list.map(p => p.id)
    }, { quoted: m })
}

handler.help = ['tagall <pesan>']
handler.tags = ['group']
handler.command = /^(tagall|everyone)$/i
handler.group = true
handler.admin = true

export default handler
