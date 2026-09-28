// The Telegram panel: bind this account's chat, see what it is set to,
// unbind. Shown above the driver threads — the bridge carries exactly
// these threads, so the two facts belong on one screen.
//
// No hardcoded colors (var(--…)), no forbidden words; the copy states
// what the bridge does, in the app's own voice.

import { useState } from 'react'
import { createCode, unlink } from '../api/telegram'
import { ApiError } from '../api/client'

function expiryLine(iso) {
  if (!iso) return ''
  const minutes = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000))
  return `valid for ${minutes} more minute${minutes === 1 ? '' : 's'}`
}

export default function TelegramPanel({ status, onRefresh }) {
  const [code, setCode] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function onCreateCode() {
    setBusy(true)
    setError('')
    try {
      const created = await createCode()
      setCode(created.code)
      setExpiresAt(created.expiresAt)
      setCopied(false)
    } catch (err) {
      setError(err?.message || 'Could not create a code.')
    } finally {
      setBusy(false)
    }
  }

  async function onUnlink() {
    setBusy(true)
    setError('')
    try {
      await unlink()
      setCode(null)
      onRefresh?.()
    } catch (err) {
      setError(err?.message || 'Could not unlink the chat.')
    } finally {
      setBusy(false)
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  if (status && !status.enabled) {
    return null
  }

  return (
    <section className="tg-panel" aria-label="Telegram">
      <div className="tg-panel-head">
        <div>
          <div className="tg-panel-title">Telegram</div>
          <div className="tg-panel-sub">
            Text your drivers from a Telegram group. The bot speaks as each driver;
            replies you send there land in these threads.
          </div>
        </div>
      </div>

      {error && <div className="tg-error" role="alert">{error}</div>}

      {status?.link ? (
        <div className="tg-linked">
          <div className="tg-linked-row">
            <span className="tg-label">Linked chat</span>
            <span className="mono">{status.link.chatId}</span>
          </div>
          {status.link.currentDriverName && (
            <div className="tg-linked-row">
              <span className="tg-label">Talking to</span>
              <span>{status.link.currentDriverName}</span>
            </div>
          )}
          <div className="tg-actions">
            <button type="button" className="tg-btn" onClick={onUnlink} disabled={busy}>
              Unlink chat
            </button>
          </div>
        </div>
      ) : (
        <div className="tg-linking">
          {code ? (
            <div className="tg-code-row">
              <span className="tg-code mono">{code}</span>
              <button type="button" className="tg-btn" onClick={onCopy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <span className="tg-expiry">{expiryLine(expiresAt)}</span>
            </div>
          ) : (
            <div className="tg-actions">
              <button type="button" className="tg-btn" onClick={onCreateCode} disabled={busy}>
                Generate link code
              </button>
            </div>
          )}
          <ol className="tg-steps">
            <li>Add the bot to your Telegram group.</li>
            {code && <li>Send <span className="mono">/link {code}</span> in that group.</li>}
            <li>Pick a driver with <span className="mono">/d &lt;name&gt;</span>, or just reply to the bot&apos;s messages.</li>
          </ol>
        </div>
      )}
    </section>
  )
}
