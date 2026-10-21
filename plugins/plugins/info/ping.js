import os from 'os'

function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let i = 0, v = bytes
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
    }
    return `${v.toFixed(1)} ${units[i]}`
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return [
        ...(d ? [`${d} hari`] : []),
        ...(h ? [`${h} jam`] : []),
        ...(m ? [`${m} menit`] : []),
        `${s} detik`
    ].join(' ')
}

let handler = async (m, { conn }) => {
    const start = Date.now()
    const memory = process.memoryUsage()
    const speed = Date.now() - start

    const text = `🏓 *PONG!* • *${speed}ms*\n\n` +
        `💻 *Platform:* ${os.type()} (${os.arch()})\n` +
        `🧠 *RAM:* ${formatSize(os.totalmem() - os.freemem())} / ${formatSize(os.totalmem())}\n` +
        `📦 *Heap Used:* ${formatSize(memory.heapUsed)}\n` +
        `⏱️ *Uptime Bot:* ${formatUptime(process.uptime())}`

    await m.reply(text)
}

handler.help = ['ping', 'speed']
handler.tags = ['info']
handler.command = /^(ping|speed)$/i

export default handler
