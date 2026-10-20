import util from 'util'
import { exec } from 'child_process'

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    if (!text) return m.reply(`Contoh: ${usedPrefix}${command} console.log("hello")`)

    // Exec Shell ($)
    if (command === '$') {
        exec(text, (err, stdout, stderr) => {
            if (err) return m.reply(err.toString())
            if (stderr) return m.reply(stderr.toString())
            if (stdout) return m.reply(stdout.toString())
            m.reply('Done (tanpa output).')
        })
        return
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
