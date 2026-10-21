import util, { promisify } from 'util'
import cp, { exec as _exec } from 'child_process'

const exec = promisify(_exec).bind(cp)

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    if (!text) return m.reply(`Contoh: ${usedPrefix}${command} console.log("hello")`)

    // Exec Shell ($)
    if (command === '$') {
        try {
            const { stdout, stderr } = await exec(text)
            if (stdout && stdout.trim()) return await m.reply(stdout.trim())
            if (stderr && stderr.trim()) return await m.reply(stderr.trim())
            return await m.reply('Done (tanpa output).')
        } catch (err) {
            return await m.reply(err.toString())
        }
    }
    // JavaScript Eval (> atau =>)
    let output
    try {
        let code = command === '=>' ? `(async () => { return ${text} })()` : text
        output = await eval(code)
        if (typeof output !== 'string') {
            output = util.inspect(output, { depth: 2 })
        }
    } catch (e) {
        output = e.stack || e.toString()
    }

    await m.reply(output)
}

handler.help = ['> <code>', '$ <cmd>']
handler.tags = ['owner']
handler.command = /^([>$]|=>)$/
handler.owner = true

export default handler
