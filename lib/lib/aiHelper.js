/**
 * Helper permintaan chat AI gratis tanpa API key pribadi
 */

export async function askRewind(model, prompt, system = 'Kamu adalah asisten kecerdasan buatan (AI) yang ramah, cerdas, dan membantu.') {
    const res = await fetch('https://api.rewind.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
            'Origin': 'https://rewind.ai',
            'Referer': 'https://rewind.ai/'
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        })
    })

    if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('Model AI tidak memberikan respon.')
    return content.trim()
}

export async function askClaude(prompt) {
    const res = await fetch(`https://api-faa.my.id/faa/claude-ai?text=${encodeURIComponent(prompt)}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
    const data = await res.json()
    const content = data?.result
    if (!content) throw new Error('Claude AI tidak memberikan respon.')
    return content.trim()
}

export async function askPollinations(prompt, model = 'openai') {
    const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${model}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`)
    const text = await res.text()
    if (!text) throw new Error('OpenAI tidak memberikan respon.')
    return text.trim()
}
