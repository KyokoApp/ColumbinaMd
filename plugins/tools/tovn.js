import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Setup FFmpeg: Coba pakai fluent-ffmpeg & @ffmpeg-installer/ffmpeg, fallback ke binary sistem jika belum terinstall
let fluentFfmpeg = null
try {
    const ffMod = await import('fluent-ffmpeg')
    const ffInst = await import('@ffmpeg-installer/ffmpeg')
    fluentFfmpeg = ffMod.default || ffMod
    const binaryPath = ffInst?.default?.path || ffInst?.path
    if (binaryPath) {
        fluentFfmpeg.setFfmpegPath(binaryPath)
    }
} catch (_) {
    // Paket belum terpasang, akan menggunakan ffmpeg bawaan OS
}

let handler = async (m, { conn, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!/video|audio/.test(mime)) {
        return m.reply(`🎙️ Balas (*reply*) video atau audio yang ingin diubah menjadi Voice Note (VN) dengan perintah:\n*${usedPrefix + command}*`)
    }

    const tmpDir = path.join(__dirname, '../../tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const inputPath = path.join(tmpDir, `tovn_in_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)
    const outputPath = path.join(tmpDir, `tovn_out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.opus`)

    await m.react('⏳')

    try {
        const buffer = await q.download()
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Gagal mengunduh media.')

        await fs.promises.writeFile(inputPath, buffer)

        // Konversi ke audio Opus / Ogg untuk WhatsApp PTT (Voice Note)
        if (fluentFfmpeg) {
            await new Promise((resolve, reject) => {
                fluentFfmpeg(inputPath)
                    .noVideo()
                    .audioCodec('libopus')
                    .format('ogg')
                    .audioChannels(1)
                    .audioFrequency(48000)
                    .addOutputOptions([
                        '-avoid_negative_ts make_zero'
                    ])
                    .on('end', resolve)
                    .on('error', reject)
                    .save(outputPath)
            })
        } else {
            await new Promise((resolve, reject) => {
                const proc = spawn('ffmpeg', [
                    '-y',
                    '-i', inputPath,
                    '-vn',
                    '-c:a', 'libopus',
                    '-f', 'ogg',
                    '-ac', '1',
                    '-ar', '48000',
                    '-avoid_negative_ts', 'make_zero',
                    outputPath
                ])
                proc.on('close', code => {
                    if (code === 0) resolve()
                    else reject(new Error(`FFmpeg exit code ${code}`))
                })
                proc.on('error', reject)
            })
        }

        const audioBuffer = await fs.promises.readFile(outputPath)

        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true
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
