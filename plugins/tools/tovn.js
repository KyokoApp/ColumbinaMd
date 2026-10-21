import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, execSync } from 'child_process'
import crypto from 'node:crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Setup FFmpeg
let fluentFfmpeg = null
try {
    const ffMod = await import('fluent-ffmpeg')
    const ffInst = await import('@ffmpeg-installer/ffmpeg')
    fluentFfmpeg = ffMod.default || ffMod
    const binaryPath = ffInst?.default?.path || ffInst?.path
    if (binaryPath) {
        fluentFfmpeg.setFfmpegPath(binaryPath)
    }
} catch (_) {}

/**
 * Deteksi durasi audio dalam detik agar WhatsApp player tidak freeze (00:00)
 */
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

/**
 * Generate visual waveform WhatsApp (64 bytes Uint8Array)
 */
function generateWaveform() {
    return Buffer.from(crypto.randomBytes(64).map(b => Math.min(100, Math.floor(b % 100))))
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
    const outputPath = path.join(tmpDir, `tovn_out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.ogg`)

    await m.react('⏳')

    try {
        const buffer = await q.download()
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Gagal mengunduh media.')

        await fs.promises.writeFile(inputPath, buffer)

        // Transcoding ke format PTT WhatsApp resmi (Ogg Opus mono 48kHz bitrate 128k VBR)
        if (fluentFfmpeg) {
            await new Promise((resolve, reject) => {
                fluentFfmpeg(inputPath)
                    .noVideo()
                    .audioCodec('libopus')
                    .format('ogg')
                    .audioChannels(1)
                    .audioFrequency(48000)
                    .audioBitrate('128k')
                    .addOutputOptions(['-vbr on'])
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
                    '-b:a', '128k',
                    '-vbr', 'on',
                    '-ar', '48000',
                    '-ac', '1',
                    '-f', 'ogg',
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
        const duration = getAudioDuration(outputPath)
        const waveform = generateWaveform()

        // Kirim sebagai PTT WhatsApp dengan seconds & waveform lengkap agar bisa langsung diputar
        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            seconds: duration,
            waveform: waveform
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
