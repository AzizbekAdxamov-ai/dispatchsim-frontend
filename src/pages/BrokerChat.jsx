import { useState, useCallback } from 'react'
import { ChatCircle, DownloadSimple } from '@phosphor-icons/react'
import { listConversations, sendMessage, agreeRate, downloadRateConfirmation } from '../api/brokerChat'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import { formatMoney } from '../utils/format'
import '../components/dashboard/Panel.css'
import './BrokerChat.css'

// Every failure here used to end at console.error, so a rejected rate or a
// dead provider looked identical to nothing happening — the button simply
// stopped spinning. Errors are matched on ApiError.code, never on message
// text, and the server's own wording is kept where it carries detail the
// client cannot reconstruct (RATE_OUT_OF_BAND names the allowed range).
function actionErrorText(err) {
  const code = err instanceof ApiError ? err.code : null
  switch (code) {
    case 'CHAT_DAILY_LIMIT':
      return "You've hit today's message limit. It resets tomorrow."
    case 'CHAT_UNAVAILABLE':
      return 'The broker cannot be reached right now. Try again in a moment.'
    case 'RATE_OUT_OF_BAND':
      return err.message
    case 'POSTING_TAKEN':
      return 'This load has already been booked by someone else.'
    case 'POSTING_EXPIRED':
      return 'This load has expired.'
    case 'CONVERSATION_NOT_FOUND':
      return 'This conversation is no longer available.'
    case 'NOT_AGREED_YET':
      return 'Agree on a rate first — the confirmation needs a number on it.'
    default:
      return err?.message || 'Something went wrong. Please try again.'
  }
}

export default function BrokerChat() {
  const [selectedId, setSelectedId] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [rateInput, setRateInput] = useState('')
  const [agreeing, setAgreeing] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const fetchConversations = useCallback(async (signal) => {
    return await listConversations(signal)
  }, [])

  const { data, error, loading, refetch } = useResource(fetchConversations, [], { pollMs: 15000 })

  const conversations = data?.conversations ?? []
  const selected = conversations.find((c) => c.id === selectedId)

  async function handleSend() {
    if (!messageText.trim() || sending || !selectedId) return
    setActionError('')
    setSending(true)
    try {
      await sendMessage(selectedId, messageText.trim())
      setMessageText('')
      refetch()
    } catch (err) {
      setActionError(actionErrorText(err))
    } finally {
      setSending(false)
    }
  }

  async function handleAgree() {
    if (!rateInput || agreeing || !selectedId) return
    const rateUsd = Number(rateInput)
    if (isNaN(rateUsd) || rateUsd <= 0) return
    setActionError('')
    setAgreeing(true)
    try {
      await agreeRate(selectedId, rateUsd)
      setRateInput('')
      refetch()
    } catch (err) {
      setActionError(actionErrorText(err))
    } finally {
      setAgreeing(false)
    }
  }

  async function handleDownload(conversationId) {
    if (downloading) return
    setActionError('')
    setDownloading(true)
    try {
      await downloadRateConfirmation(conversationId)
    } catch (err) {
      setActionError(actionErrorText(err))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="broker-chat">
      <div className="bc-list">
        <div className="bc-list-head">
          Brokers <span className="panel-count">{conversations.length}</span>
        </div>
        <div className="bc-list-body">
          {loading && <div className="bc-empty">Loading…</div>}
          {!loading && error && <div className="bc-empty">Could not load conversations</div>}
          {!loading && !error && conversations.length === 0 && (
            <div className="bc-empty" style={{ padding: 24 }}>
              No broker conversations yet — open one from the load board.
            </div>
          )}
          {!loading && !error && conversations.map((c) => (
            <div
              key={c.id}
              className={`bc-item ${c.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="bc-item-route">
                {c.originCity}, {c.originState} → {c.destinationCity}, {c.destinationState}
              </div>
              <div className="bc-item-broker">{c.brokerName}</div>
              <div className="bc-item-meta">
                {c.agreedRateUsd ? `Agreed: ${formatMoney(c.agreedRateUsd)}` : `${c.messageCount} messages`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bc-thread">
        {!selected && (
          <div className="page-empty">
            <ChatCircle size={32} weight="thin" style={{ opacity: 0.3 }} />
            <div style={{ marginTop: 12 }}>Select a conversation.</div>
          </div>
        )}

        {selected && (
          <>
            <div className="bc-thread-head">
              <div className="bc-thread-route">
                {selected.originCity}, {selected.originState} → {selected.destinationCity}, {selected.destinationState}
              </div>
              <div className="bc-thread-broker">{selected.brokerName}</div>
            </div>

            <div className="bc-thread-body">
              <div className="bc-empty">
                Messages would appear here. The broker responds via AI.
              </div>
            </div>

            <div className="bc-thread-footer">
              {actionError && (
                <div className="bc-action-error" role="alert">{actionError}</div>
              )}
              {selected.status === 'agreed' && (
                <div className="bc-agreed-bar">
                  <span>Agreed: {formatMoney(selected.agreedRateUsd)}</span>
                  <button
                    type="button"
                    className="bc-download-btn"
                    disabled={downloading}
                    onClick={() => handleDownload(selected.id)}
                  >
                    <DownloadSimple size={14} />
                    {downloading ? 'Downloading…' : 'Download rate confirmation'}
                  </button>
                </div>
              )}

              {selected.status !== 'agreed' && (
                <div className="bc-rate-row">
                  <input
                    type="number"
                    placeholder="Agreed rate ($)"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    className="bc-rate-input"
                  />
                  <button
                    type="button"
                    className="bc-agree-btn"
                    disabled={agreeing || !rateInput}
                    onClick={handleAgree}
                  >
                    {agreeing ? 'Saving…' : 'Agree'}
                  </button>
                </div>
              )}

              <div className="bc-send-row">
                <input
                  type="text"
                  placeholder="Type a message…"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="bc-send-input"
                />
                <button
                  type="button"
                  className="bc-send-btn"
                  disabled={sending || !messageText.trim()}
                  onClick={handleSend}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
