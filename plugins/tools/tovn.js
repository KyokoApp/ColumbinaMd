import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'

const ffmpegBin = ffmpegInstaller.path

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function checkHasAudio(filePath) {
    return new Promise((resolve) => {
        execFile('ffprobe', [
            '-v', 'error',
            '-select_streams', 'a',
            '-show_entries', 'stream=codec_type',
            '-of', 'csv=p=0',
            filePath
        ], (err, stdout) => {
            if (err) return resolve(false)
            resolve(Boolean(stdout && stdout.trim().length > 0))
        })
    })
}

async function convertToPTT(buffer, isVideo = false) {
    const tmpDir = path.join(__dirname, '../../tmp')
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const ext = isVideo ? '.mp4' : '.bin'
    const inPath = path.join(tmpDir, `ptt_in_${id}${ext}`)
    const wavPath = path.join(tmpDir, `ptt_mid_${id}.wav`)
    const outPath = path.join(tmpDir, `ptt_out_${id}.ogg`)

    await fs.promises.writeFile(inPath, buffer)

    try {
        if (isVideo) {
            const hasAudio = await checkHasAudio(inPath)
            if (!hasAudio) {
                throw new Error('Video ini tidak memiliki track audio (video bisu).')
            }

            // Tahap 1: Ekstrak track audio pertama video ke WAV mentah (pcm_s16le, mono, 48kHz)
            await new Promise((resolve, reject) => {
                execFile(ffmpegBin, [
                    '-y',
                    '-i', inPath,
                    '-vn',
                    '-map', '0:a:0',
                    '-acodec', 'pcm_s16le',
                    '-ac', '1',
                    '-ar', '48000',
                    wavPath
                ], (err, stdout, stderr) => {
                    if (err) return reject(new Error(stderr || err.message))
                    resolve()
                })
            })

            // Tahap 2: Encode audio WAV ke OGG/Opus PTT standar komunitas
            await new Promise((resolve, reject) => {
                execFile(ffmpegBin, [
                    '-y',
                    '-i', wavPath,
                    '-c:a', 'libopus',
                    '-b:a', '128k',
                    '-vbr', 'on',
                    '-f', 'ogg',
                    outPath
                ], (err, stdout, stderr) => {
                    if (err) return reject(new Error(stderr || err.message))
                    resolve()
                })
            })
        } else {
            // Audio langsung di-encode ke OGG/Opus PTT
            await new Promise((resolve, reject) => {
                execFile(ffmpegBin, [
                    '-y',
                    '-i', inPath,
                    '-vn',
                    '-c:a', 'libopus',
                    '-ac', '1',
                    '-ar', '48000',
                    '-b:a', '128k',
                    '-vbr', 'on',
                    '-f', 'ogg',
                    outPath
                ], (err, stdout, stderr) => {
                    if (err) return reject(new Error(stderr || err.message))
                    resolve()
                })
            })
        }

        const data = await fs.promises.readFile(outPath)
        return data
    } finally {
        fs.promises.unlink(inPath).catch(() => {})
        fs.promises.unlink(wavPath).catch(() => {})
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

        const isVideo = /video/.test(mime)
        const pttAudio = await convertToPTT(media, isVideo)
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
