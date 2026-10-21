import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataPath = path.join(__dirname, '../../lib/family100.json')

// Muat dataset Family 100 ke memori
let questions = []
try {
    if (fs.existsSync(dataPath)) {
        questions = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
    }
} catch (e) {
    console.error('[FAMILY100 DATA LOAD ERROR]', e.message)
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    conn.family100 = conn.family100 || {}

    // Cek apakah ada game yang sedang berjalan di chat ini
    if (m.chat in conn.family100) {
        const room = conn.family100[m.chat]
        const sub = (text || '').toLowerCase().trim()

        // Perintah menyerah
        if (sub === 'menyerah' || sub === 'surrender') {
            clearTimeout(room.timer)
            let cap = `🏳️ *GAME FAMILY 100 DIAKHIRI*\n\n`
            cap += `Game diakhiri atas permintaan @${m.sender.split('@')[0]}.\n`
            cap += `*Pertanyaan:* ${room.soal}\n\n`
            cap += `*Kunci Jawaban:*\n`
            room.jawaban.forEach((j, i) => {
                cap += `${i + 1}. ${j} ${room.terjawab[i] ? '✅' : '❌'}\n`
            })
            delete conn.family100[m.chat]
            return conn.sendMessage(m.chat, { text: cap, mentions: [m.sender] }, { quoted: m })
        }

        return m.reply(`⚠️ Masih ada game Family 100 yang sedang berlangsung di grup ini!\n\n*Pertanyaan:* ${room.soal}\n\n_Ketik jawaban langsung di chat atau ketik *${usedPrefix}${command} menyerah* untuk mengakhiri._`)
    }

    if (!questions.length) {
        return m.reply('❌ Database pertanyaan Family 100 belum tersedia.')
    }

    // Ambil soal secara acak
    const q = questions[Math.floor(Math.random() * questions.length)]
    const answers = q.jawaban.map(j => j.trim())

    // Simpan room di sesi koneksi
    conn.family100[m.chat] = {
        id: m.chat,
        soal: q.soal,
        jawaban: answers,
        terjawab: new Array(answers.length).fill(null),
        timer: setTimeout(async () => {
            if (conn.family100[m.chat]) {
                const current = conn.family100[m.chat]
                let timeoutMsg = `⏳ *WAKTU HABIS!*\n\n`
                timeoutMsg += `Game Family 100 telah berakhir karena batas waktu 2 menit tercapai.\n\n`
                timeoutMsg += `*Pertanyaan:* ${current.soal}\n\n`
                timeoutMsg += `*Daftar Jawaban:*\n`
                current.jawaban.forEach((j, i) => {
                    const by = current.terjawab[i] ? `(oleh ${current.terjawab[i]})` : '❌'
                    timeoutMsg += `${i + 1}. ${j} ${by}\n`
                })
                delete conn.family100[m.chat]
                await conn.sendMessage(m.chat, { text: timeoutMsg })
            }
        }, 120000) // Batas waktu 120 detik
    }

    let board = `🎮 *FAMILY 100*\n\n`
    board += `*Pertanyaan:*\n${q.soal}\n\n`
    board += `Terdapat *${answers.length}* jawaban survei:\n`
    answers.forEach((_, i) => {
        board += `${i + 1}. ❓ ________________\n`
    })
    board += `\n_Jawab langsung di chat tanpa prefix._\n`
    board += `_Waktu: 120 detik • Ketik "${usedPrefix}${command} menyerah" untuk menyerah._`

    await m.reply(board)
}

// Hook sebelum handler lain dieksekusi untuk menangkap tebakan pemain
handler.before = async function (m, { conn }) {
    conn.family100 = conn.family100 || {}
    const room = conn.family100[m.chat]
    if (!room) return
    if (!m.text) return

    // Abaikan jika berupa perintah ber-prefix (kecuali kata 'menyerah')
    const raw = m.text.trim().toLowerCase()
    if (raw === 'menyerah') {
        clearTimeout(room.timer)
        let cap = `🏳️ *MENYERAH!*\n\n`
        cap += `Game diakhiri oleh @${m.sender.split('@')[0]}.\n`
        cap += `*Pertanyaan:* ${room.soal}\n\n`
        cap += `*Kunci Jawaban:*\n`
        room.jawaban.forEach((j, i) => {
            cap += `${i + 1}. ${j} ${room.terjawab[i] ? '✅' : '❌'}\n`
        })
        delete conn.family100[m.chat]
        await conn.sendMessage(m.chat, { text: cap, mentions: [m.sender] }, { quoted: m })
        return true
    }

    if (raw.startsWith('.') || raw.startsWith('#') || raw.startsWith('!')) return

    // Cek apakah pesan cocok dengan salah satu jawaban yang belum terjawab
    const matchIndex = room.jawaban.findIndex((ans, idx) => {
        if (room.terjawab[idx]) return false
        // Pecah bila ada varian pemisah garis miring (/)
        const variants = ans.split('/').map(v => v.trim().toLowerCase()).filter(Boolean)
        variants.push(ans.toLowerCase().trim())
        return variants.some(v => v === raw)
    })

    if (matchIndex >= 0) {
        const playerName = m.pushName || m.sender.split('@')[0]
        room.terjawab[matchIndex] = playerName

        const allDone = room.terjawab.every(v => v !== null)

        if (allDone) {
            clearTimeout(room.timer)
            let winText = `🎉 *LUAR BIASA! SEMUA JAWABAN TERTEBAK!*\n\n`
            winText += `*Pertanyaan:* ${room.soal}\n\n`
            winText += `*Hasil Lengkap:*\n`
            room.jawaban.forEach((j, i) => {
                winText += `${i + 1}. ${j} *(oleh ${room.terjawab[i]})*\n`
            })
            winText += `\n_Game Family 100 selesai._`
            delete conn.family100[m.chat]
            await conn.sendMessage(m.chat, { text: winText }, { quoted: m })
            return true
        }

        // Tampilkan papan terkini
        const remaining = room.terjawab.filter(v => v === null).length
        let updateText = `🎯 *BENAR!* (@${m.sender.split('@')[0]})\n`
        updateText += `Jawaban *"${room.jawaban[matchIndex]}"* berhasil ditebak!\n\n`
        updateText += `*Pertanyaan:* ${room.soal}\n\n`
        room.jawaban.forEach((j, i) => {
            if (room.terjawab[i]) {
                updateText += `${i + 1}. ${j} *(oleh ${room.terjawab[i]})*\n`
            } else {
                updateText += `${i + 1}. ❓ ________________\n`
            }
        })
        updateText += `\n_Tersisa *${remaining}* jawaban lagi. Ayo tebak!_`

        await conn.sendMessage(m.chat, { text: updateText, mentions: [m.sender] }, { quoted: m })
        return true
    }
}

handler.help = ['family100']
handler.tags = ['game']
handler.command = /^(family100|f100)$/i
handler.group = true

export default handler
