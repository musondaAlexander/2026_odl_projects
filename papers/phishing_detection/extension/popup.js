async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function render(verdict) {
  const el = document.getElementById('verdict')
  if (!verdict) { el.textContent = 'Could not reach the detection service (is it running on :8000?).'; return }
  const phishing = verdict.label === 'phishing'
  const pct = Math.round(verdict.phishing_probability * 100)
  el.innerHTML = `
    <div class="${phishing ? 'danger' : 'safe'}" style="font-size:16px;font-weight:700">
      ${phishing ? '⚠ Likely phishing' : '✓ Looks legitimate'}
    </div>
    <div class="bar"><div style="width:${pct}%;background:${phishing ? '#f87171' : '#4ade80'}"></div></div>
    <div class="muted">Phishing probability: ${pct}% · ${verdict.latency_ms ?? '?'} ms</div>`
}

async function init() {
  const tab = await currentTab()
  if (tab?.url && /^https?:/.test(tab.url)) {
    chrome.runtime.sendMessage({ type: 'classifyCurrent', url: tab.url }, render)
  } else {
    document.getElementById('verdict').textContent = 'No web page to check.'
  }
  const { history = [] } = await chrome.storage.local.get({ history: [] })
  document.getElementById('history').innerHTML = history.slice(0, 8).map((h) =>
    `<div class="item"><span class="${h.label === 'phishing' ? 'danger' : 'safe'}">${h.label === 'phishing' ? '⚠' : '✓'}</span>
     ${h.host} <span class="muted">(${Math.round(h.phishing_probability * 100)}%)</span></div>`).join('')
  document.getElementById('opts').onclick = () => chrome.runtime.openOptionsPage()
}
init()
