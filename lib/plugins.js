import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export const plugins = {}

/**
 * Scan seluruh file berekstensi .js di dalam folder
 */
function getFiles(dir) {
    let results = []
    if (!fs.existsSync(dir)) return results
    const list = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of list) {
        const fullPath = path.join(dir, item.name)
        if (item.isDirectory()) {
            results = results.concat(getFiles(fullPath))
        } else if (item.isFile() && item.name.endsWith('.js')) {
            results.push(fullPath)
        }
    }
    return results
}

/**
 * Memuat satu plugin secara dinamis
 */
export async function loadPlugin(filePath) {
    const relative = path.relative(process.cwd(), filePath).replace(/\\/g, '/')
    try {
        const fileUrl = `${pathToFileURL(filePath).href}?update=${Date.now()}`
        const module = await import(fileUrl)
        plugins[relative] = module.default || module
        return true
    } catch (err) {
        console.error(`[PLUGIN ERROR] Gagal memuat ${relative}:`, err.message)
        delete plugins[relative]
        return false
    }
}

/**
 * Memuat semua plugin awal dan memasang file watcher (Hot-Reload)
 */
export async function initPlugins(pluginDir = './plugins') {
    const files = getFiles(pluginDir)
    for (const file of files) {
        await loadPlugin(file)
    }
    console.log(`[PLUGINS] Berhasil memuat ${Object.keys(plugins).length} plugin.`)

    // Hot-reload watcher
    if (fs.existsSync(pluginDir)) {
        fs.watch(pluginDir, { recursive: true }, async (eventType, filename) => {
            if (!filename || !filename.endsWith('.js')) return
            const fullPath = path.join(pluginDir, filename)
            const relative = path.relative(process.cwd(), fullPath).replace(/\\/g, '/')

            if (fs.existsSync(fullPath)) {
                console.log(`[PLUGINS] Reloading: ${relative}`)
                await loadPlugin(fullPath)
            } else {
                console.log(`[PLUGINS] Unloaded: ${relative}`)
                delete plugins[relative]
            }
        })
    }
}
