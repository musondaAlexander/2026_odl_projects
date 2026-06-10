// Service worker: classify each top-frame navigation, set a badge, cache verdicts.
const API = 'http://localhost:8000/classify'
const cache = new Map() // url -> verdict (LRU-ish)
const CACHE_MAX = 200

const defaults = { threshold: 0.5, whitelist: ['google.com', 'wikipedia.org', 'github.com'] }

async function settings() {
  const s = await chrome.storage.local.get(defaults)
  return { ...defaults, ...s }
}

function hostname(url) {
  try { return new URL(url).hostname } catch { return '' }
}

function setBadge(tabId, verdict) {
  const phishing = verdict?.label === 'phishing'
  chrome.action.setBadgeBackgroundColor({ color: phishing ? '#dc2626' : '#16a34a' })
  chrome.action.setBadgeText({ tabId, text: phishing ? '!' : '✓' })
}

async function classify(url) {
  if (cache.has(url)) return cache.get(url)
  const { threshold } = await settings()
  const res = await fetch(API, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, threshold }),
  })
  const verdict = await res.json()
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value)
  cache.set(url, verdict)
  return verdict
}

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return // top frame only
  const url = details.url
  if (!/^https?:/.test(url)) return
  const { whitelist } = await settings()
  const host = hostname(url)
  if (whitelist.some((w) => host === w || host.endsWith('.' + w))) {
    setBadge(details.tabId, { label: 'legitimate' })
    return
  }
  try {
    const verdict = await classify(url)
    setBadge(details.tabId, verdict)
    await addHistory({ url, host, ...verdict, at: Date.now() })
    if (verdict.label === 'phishing') {
      chrome.action.setPopup({ tabId: details.tabId, popup: 'popup.html' })
    }
  } catch (e) {
    chrome.action.setBadgeText({ tabId: details.tabId, text: '?' })
  }
})

async function addHistory(entry) {
  const { history = [] } = await chrome.storage.local.get({ history: [] })
  history.unshift(entry)
  await chrome.storage.local.set({ history: history.slice(0, 50) })
}

// Popup asks for the current tab's verdict.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'classifyCurrent') {
    classify(msg.url).then(sendResponse).catch(() => sendResponse(null))
    return true
  }
})
