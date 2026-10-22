import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync, spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Hitung waveform dari file PCM (standar Baileys / WhatsApp PTT)
 */
function getWaveformFromPCM(pcmData, samples = 64) {
    if (!pcmData || !pcmData.length) return Array(samples).fill(0)
    const blockSize = Math.floor(pcmData.length / samples) || 1
    const waveform = []
    for (let i = 0; i < samples; i++) {
        let sum = 0
        const start = i * blockSize
        const end = Math.min(start + blockSize, pcmData.length)
        for (let j = start; j < end; j++) {
            sum += Math.abs(pcmData[j])
        }
        waveform.push(Math.min(100, Math.floor(sum / (end - start || 1) / 20)))
    }
    return waveform
}

/**
 * Deteksi durasi audio dalam detik
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
    const pcmPath = path.join(tmpDir, `tovn_pcm_${id}.pcm`)

    await m.react('⏳')

    try {
        const buffer = await q.download()
        if (!buffer || !Buffer.isBuffer(buffer)) throw new Error('Gagal mengunduh media.')

        await fs.promises.writeFile(inputPath, buffer)

        // Transcoding ke format PTT WhatsApp resmi (Ogg Opus mono 48kHz bitrate 128k)
        execSync(`ffmpeg -y -i "${inputPath}" -vn -c:a libopus -b:a 128k -ar 48000 -ac 1 "${outputPath}"`, {
            timeout: 30000,
            stdio: ['ignore', 'ignore', 'ignore']
        })

        // Ekstraksi waveform via PCM s16le
        let waveform = []
        try {
            execSync(`ffmpeg -y -i "${outputPath}" -f s16le -acodec pcm_s16le "${pcmPath}"`, {
                timeout: 15000,
                stdio: ['ignore', 'ignore', 'ignore']
            })
            if (fs.existsSync(pcmPath)) {
                waveform = getWaveformFromPCM(fs.readFileSync(pcmPath))
            }
        } catch (_) {}

        const duration = getAudioDuration(outputPath)
        const audioBuffer = await fs.promises.readFile(outputPath)

        await conn.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            waveform: waveform.length ? waveform : undefined,
            audioDuration: duration
        }, { quoted: m })

        await m.react('✅')
    } catch (e) {
        console.error('[tovn]', e)
        await m.react('❌')
        await m.reply(`[FAIL] Gagal mengubah media ke VN: ${e.message || e}`)
    } finally {
        [inputPath, outputPath, pcmPath].forEach(f => {
            try {
                if (fs.existsSync(f)) fs.unlinkSync(f)
            } catch (_) {}
        })
    }
}

handler.help = ['tovn <reply video/audio>']
handler.tags = ['tools', 'audio']
handler.command = /^(tovn|tovoice|vn)$/i
handler.limit = true

export default handler
