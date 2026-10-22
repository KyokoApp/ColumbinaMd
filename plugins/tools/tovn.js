import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getAudioDuration(filePath) {
    try {
        const out = execSync(`ffprobe -i "${filePath}" -show_entries format=duration -v quiet -of csv="p=0"`, {
            timeout: 5000,
            stdio: ['ignore', 'pipe', 'ignore']
        }).toString().trim()
        const sec = Math.ceil(parseFloat(out))
        return isNaN(sec) || sec <= 0 ? 1 : sec
    } catch {
        return 1
    }
}

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!/video|audio/.test(mime)) {
        return m.reply(`🎙️ Balas (*reply*) video atau audio yang ingin diubah menjadi Voice Note (VN) dengan perintah:\n*${usedPrefix + command}*`)
    }

    const tmpDir = path.join(__dirname, '../../tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const inputPath = path.join(tmpDir, `tovn_in_${id}`)
    const outputPath = path.join(tmpDir, `tovn_out_${id}.ogg`)

    await m.react('⏳')

    try {
        const buffer = await q.download()
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Gagal mengunduh media.')

        await fs.promises.writeFile(inputPath, buffer)

        // Konversi ke format Ogg Opus resmi WhatsApp Voice Note
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .noVideo()
                .audioCodec('libopus')
                .audioChannels(1)
                .audioFrequency(48000)
                .audioBitrate('64k')
                .format('ogg')
                .addOutputOptions([
                    '-application voip',
                    '-vbr on'
                ])
                .on('end', resolve)
                .on('error', (err, stdout, stderr) => reject(new Error(String(stderr || err.message).slice(-300))))
                .save(outputPath)
        })

        const audioBuffer = await fs.promises.readFile(outputPath)
        const duration = getAudioDuration(outputPath)

        // Kirim audio PTT WhatsApp murni tanpa payload yang memicu file bermasalah
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            seconds: duration
        }, { quoted: m })

        await m.react('✅')
    } catch (e) {
        console.error('[tovn]', e)
        await m.react('❌')
        await m.reply(`[FAIL] Gagal mengubah media ke VN: ${e.message || e}`)
    } finally {
        fs.promises.unlink(inputPath).catch(() => {})
        fs.promises.unlink(outputPath).catch(() => {})
    }
}

handler.help = ['tovn <reply video/audio>']
handler.tags = ['tools', 'audio']
handler.command = /^(tovn|tovoice|vn)$/i
handler.limit = true

export default handler
