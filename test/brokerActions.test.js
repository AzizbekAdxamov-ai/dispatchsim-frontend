import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const clientSource = (await readFile(new URL('../src/api/client.js', import.meta.url), 'utf8'))
  .replace('import.meta.env.VITE_API_URL', 'undefined')
const clientUrl = `data:text/javascript;base64,${Buffer.from(clientSource).toString('base64')}`
const brokerSource = (await readFile(new URL('../src/api/brokerChat.js', import.meta.url), 'utf8'))
  .replace("'./client'", JSON.stringify(clientUrl))
const memory = () => { const values = new Map(); return { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } }
globalThis.sessionStorage = memory()
globalThis.localStorage = memory()
const client = await import(clientUrl)
const { downloadRateConfirmation } = await import(`data:text/javascript;base64,${Buffer.from(brokerSource).toString('base64')}`)

test('PDF download preserves nested API errors, auth expiry and successful binary data', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const create = URL.createObjectURL
  const revoke = URL.revokeObjectURL
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'RATE_CON_NOT_ARRIVED', message: 'Not yet', details: { waiting: true } } }), { status: 409 })
    await assert.rejects(downloadRateConfirmation('A'), e => e instanceof client.ApiError && e.code === 'RATE_CON_NOT_ARRIVED' && e.message === 'Not yet' && e.details.waiting)
    let loggedOut = 0
    client.setToken('expired')
    client.setUnauthorizedHandler(() => loggedOut++)
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }), { status: 401 })
    await assert.rejects(downloadRateConfirmation('A'), { code: 'TOKEN_EXPIRED', status: 401 })
    assert.equal(loggedOut, 1)
    assert.equal(client.getToken(), undefined)
    globalThis.fetch = async () => new Response('<html>broken</html>', { status: 502 })
    await assert.rejects(downloadRateConfirmation('A'), { code: 'INTERNAL_ERROR', status: 502, message: 'Something went wrong. Please try again.' })
    let downloaded
    let clicked = 0
    let removed = 0
    const anchor = { click() { clicked++ } }
    globalThis.document = { createElement: () => anchor, body: { appendChild() {}, removeChild() { removed++ } } }
    URL.createObjectURL = blob => { downloaded = blob; return 'blob:pdf' }
    URL.revokeObjectURL = url => assert.equal(url, 'blob:pdf')
    globalThis.fetch = async () => new Response('%PDF-1.7', { headers: { 'Content-Type': 'application/pdf' } })
    await downloadRateConfirmation('conversation-A')
    assert.equal(await downloaded.text(), '%PDF-1.7')
    assert.equal(anchor.download, 'rate-confirmation-conversa.pdf')
    assert.equal(clicked, 1)
    assert.equal(removed, 1)
    globalThis.fetch = async () => { throw new Error('offline') }
    await assert.rejects(downloadRateConfirmation('A'), { code: 'NETWORK_ERROR', status: 0 })
    // JSON endpoints continue using the exact same nested error contract.
    globalThis.fetch = async () => Response.json({ ok: true })
    assert.deepEqual(await client.api.get('/anything'), { ok: true })
  } finally {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
    URL.createObjectURL = create
    URL.revokeObjectURL = revoke
    client.setUnauthorizedHandler(null)
  }
})

const source = await readFile(new URL('../src/pages/BrokerChat.jsx', import.meta.url), 'utf8')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
function action(name, env) {
  const start = source.indexOf(`  async function ${name}(`)
  const end = source.indexOf('\n  }', start) + 4
  const fn = source.slice(start, end).trim()
  return new AsyncFunction(...Object.keys(env), `return (${fn})(...args)`)(...Object.values(env))
}
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function harness(name) {
  const pending = new Map()
  const state = { error: '', warnings: [], busy: null, refresh: 0, reload: 0, calls: [] }
  const selectedIdRef = { current: 'A' }
  const inFlight = { current: new Set() }
  const invoke = (id) => {
    const env = {
      selectedId: id, selectedIdRef, acceptInFlight: inFlight, downloadInFlight: inFlight,
      setActionError: v => { state.error = v }, setAcceptWarnings: v => { state.warnings = v },
      setAccepting: v => { state.busy = typeof v === 'function' ? v(state.busy) : v },
      setDownloading: v => { state.busy = typeof v === 'function' ? v(state.busy) : v },
      acceptRateCon: request, downloadRateConfirmation: request,
      reload: () => state.reload++, refetch: () => state.refresh++,
      actionErrorText: e => e.message, args: name === 'handleDownload' ? [id] : [],
    }
    function request(id) { state.calls.push(id); const d = deferred(); pending.set(id, d); return d.promise }
    return action(name, env)
  }
  return { state, pending, selectedIdRef, invoke }
}
for (const name of ['handleAccept', 'handleDownload']) {
  test(`${name}: A completion cannot overwrite B feedback or busy state; duplicate A is blocked`, async () => {
    const h = harness(name)
    const first = h.invoke('A')
    await h.invoke('A')
    assert.deepEqual(h.state.calls, ['A'])
    h.selectedIdRef.current = 'B'
    const second = h.invoke('B')
    h.state.error = 'B feedback'
    h.pending.get('A').reject(new Error('A failure'))
    await first
    assert.equal(h.state.error, 'B feedback')
    assert.equal(h.state.busy, 'B')
    h.pending.get('B').resolve({ warnings: ['B warning'] })
    await second
    assert.equal(h.state.busy, null)
    if (name === 'handleAccept') assert.deepEqual(h.state.warnings, ['B warning'])
  })
  test(`${name}: normal errors remain visible; stale success only refreshes conversation list`, async () => {
    const h = harness(name)
    const failed = h.invoke('A')
    h.pending.get('A').reject(new Error('Visible failure'))
    await failed
    assert.equal(h.state.error, 'Visible failure')
    const success = h.invoke('A')
    h.selectedIdRef.current = 'B'
    h.state.warnings = ['B warning']
    h.pending.get('A').resolve({ warnings: ['A warning'] })
    await success
    assert.deepEqual(h.state.warnings, ['B warning'])
    assert.equal(h.state.reload, 0)
    if (name === 'handleAccept') assert.equal(h.state.refresh, 1)
  })
}

 test('accept same-thread success retains warnings and refreshes the open thread', async () => {
   const h = harness('handleAccept')
   const result = h.invoke('A')
   h.pending.get('A').resolve({ warnings: ['tight-pickup-window'] })
   await result
   assert.deepEqual(h.state.warnings, ['tight-pickup-window'])
   assert.equal(h.state.reload, 1)
   assert.equal(h.state.busy, null)
 })

// Kills: the load-page link posting to the wrong path or with an unescaped id
test('openLoadConversation posts to /broker-chat/loads/:loadId', async () => {
  const { openLoadConversation } = await import(`data:text/javascript;base64,${Buffer.from(brokerSource).toString('base64')}`)
  const originalFetch = globalThis.fetch
  let seen
  try {
    globalThis.fetch = async (url, init) => { seen = { url: String(url), method: init?.method }; return Response.json({ conversation: { id: 'c1' } }) }
    const res = await openLoadConversation('600010')
    assert.equal(res.conversation.id, 'c1')
    assert.match(seen.url, /\/broker-chat\/loads\/600010$/)
    assert.equal(seen.method, 'POST')
  } finally {
    globalThis.fetch = originalFetch
  }
})
