// very small markdown-to-html for headings, bold, italic, lists, links
export function simpleMarkdown(md: string): string {
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const html: string[] = []
  let inList = false
  for (let raw of lines) {
    let line = raw
    if (/^\s*-\s+/.test(line)) {
      if (!inList) { html.push('<ul class="list-disc pl-6">'); inList = true }
      line = line.replace(/^\s*-\s+/, '')
      html.push(`<li>${inline(line)}</li>`)
      continue
    } else if (inList) {
      html.push('</ul>')
      inList = false
    }
    if (/^\s*#\s+/.test(line)) html.push(`<h1 class="text-2xl font-bold mt-4">${inline(line.replace(/^\s*#\s+/, ''))}</h1>`)
    else if (/^\s*##\s+/.test(line)) html.push(`<h2 class="text-xl font-semibold mt-3">${inline(line.replace(/^\s*##\s+/, ''))}</h2>`)
    else if (/^\s*###\s+/.test(line)) html.push(`<h3 class="text-lg font-semibold mt-2">${inline(line.replace(/^\s*###\s+/, ''))}</h3>`)
    else if (line.trim() === '') html.push('<br/>')
    else html.push(`<p>${inline(line)}</p>`)
  }
  if (inList) html.push('</ul>')
  return html.join('\n')

  function inline(s: string): string {
    s = esc(s)
    // links [text](url)
    s = s.replace(/\[(.+?)\]\((https?:[^\s)]+)\)/g, '<a class="text-blue-600 underline" href="$2" target="_blank" rel="noreferrer">$1<\/a>')
    // bold **text**
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>')
    // italic *text*
    s = s.replace(/\*(.+?)\*/g, '<em>$1<\/em>')
    // code `text`
    s = s.replace(/`([^`]+)`/g, '<code class="bg-slate-100 rounded px-1">$1<\/code>')
    return s
  }
}

