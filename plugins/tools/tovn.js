import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function convertToPTT(buffer) {
    const tmpDir = path.join(__dirname, '../../tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const inPath = path.join(tmpDir, `ptt_in_${id}`)
    const outPath = path.join(tmpDir, `ptt_out_${id}.ogg`)

    await fs.promises.writeFile(inPath, buffer)

    try {
        await new Promise((resolve, reject) => {
            ffmpeg(inPath)
                .noVideo()
                .audioCodec('libopus')
                .audioChannels(1)
                .audioFrequency(48000)
                .audioBitrate('128k')
                .format('ogg')
                .addOutputOptions(['-vbr on'])
                .on('end', resolve)
                .on('error', reject)
                .save(outPath)
        })

        const data = await fs.promises.readFile(outPath)
        return data
    } finally {
        fs.promises.unlink(inPath).catch(() => {})
        fs.promises.unlink(outPath).catch(() => {})
    }
}

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!/video|audio/.test(mime)) {
        return m.reply(`🎙️ Balas (*reply*) video atau audio yang ingin diubah menjadi Voice Note (VN) dengan perintah:\n*${usedPrefix + command}*`)
    }

    await m.react('⏳')

    try {
        const media = await q.download?.()
        if (!media || !Buffer.isBuffer(media) || !media.length) {
            throw new Error('Gagal mengunduh media dari pesan.')
        }

        const pttAudio = await convertToPTT(media)
        if (!pttAudio || !pttAudio.length) {
            throw new Error('Gagal mengonversi media ke Voice Note.')
        }

        // Metode 1: Standar komunitas bot Baileys modern menggunakan sendFile dengan audio/mp4 (bebas galat audio bermasalah)
        let sent = null
        try {
            sent = await conn.sendFile(m.chat, pttAudio, 'audio.mp4', '', m, true, {
                mimetype: 'audio/mp4',
                ptt: true
            })
        } catch (errSend) {
            console.error('[tovn] sendFile error, fallback to sendMessage:', errSend)
        }

        // Metode 2: Fallback ke sendMessage bila sendFile terkendala
        if (!sent) {
            await conn.sendMessage(m.chat, {
                audio: pttAudio,
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: m })
        }

        await m.react('✅')
    } catch (e) {
        console.error('[tovn]', e)
        await m.react('❌')
        await m.reply(`[FAIL] Gagal mengubah media ke VN: ${e.message || e}`)
    }
}

handler.help = ['tovn <reply video/audio>']
handler.tags = ['tools', 'audio']
handler.command = /^(tovn|tovoice|vn|toptt)$/i
handler.limit = true

export default handler
