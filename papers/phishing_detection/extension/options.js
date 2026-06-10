const defaults = { threshold: 0.5, whitelist: ['google.com', 'wikipedia.org', 'github.com'] }

async function load() {
  const s = await chrome.storage.local.get(defaults)
  document.getElementById('threshold').value = s.threshold
  document.getElementById('whitelist').value = (s.whitelist || []).join('\n')
}

document.getElementById('save').onclick = async () => {
  const threshold = parseFloat(document.getElementById('threshold').value) || 0.5
  const whitelist = document.getElementById('whitelist').value.split('\n').map((s) => s.trim()).filter(Boolean)
  await chrome.storage.local.set({ threshold, whitelist })
  document.getElementById('status').textContent = '✓ Saved'
  setTimeout(() => (document.getElementById('status').textContent = ''), 1500)
}
load()
