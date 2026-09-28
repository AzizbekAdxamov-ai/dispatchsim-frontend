import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatCircle, PaperPlaneTilt } from '@phosphor-icons/react'
import { listThreads, openConversation, getThread, sendMessage } from '../api/driverChat'
import { getStatus as getTelegramStatus } from '../api/telegram'
import { useResource } from '../hooks/useResource'
import { ApiError } from '../api/client'
import { chatLimitMessage } from '../utils/chatBudget.js'
import TelegramPanel from '../components/TelegramPanel'
import './DriverChat.css'

// Texting your drivers.
//
// One thread per driver, never closed. What makes this page worth having
// is the panel on the right: what this person is owed, sitting next to
// what they are saying about it. A dispatcher who can see "$1,840, 9 days"
// while reading "when is that hitting my account" has the whole situation
// in one place, which is the entire lesson.
//
// The refusal is NOT decided here and not decided by the chat. dispatchLoad
// reads driver_settlements and refuses; this is where the person explains.

// What each stage means, in the driver's terms.
const STAGE_LINE = {
  ok: null,
  asks: 'asking when it is coming',
  refuses: 'not taking new loads until it is paid',
  quits: 'has left the company',
}

function money(n) {
  return `$${Math.abs(n ?? 0).toLocaleString('en-US')}`
}

export default function DriverChat() {
  const [conversationId, setConversationId] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const fetchThreads = useCallback((signal) => listThreads(signal), [])
  const { data: listData, error: listError, loading: listLoading, refetch: refetchList } =
    useResource(fetchThreads, [], { pollMs: 20000 })

  // The bridge panel sits above the threads: one read, no polling -- the
  // link state changes only when the user acts on it.
  const fetchTgStatus = useCallback((signal) => getTelegramStatus(signal), [])
  const { data: tgStatus, refetch: refetchTgStatus } = useResource(fetchTgStatus, [], {})

  // Polled: the driver's reply is written when you send and becomes
  // visible when it comes due.
  const fetchThread = useCallback(
    (signal) => (conversationId ? getThread(conversationId, signal) : Promise.resolve(null)),
    [conversationId],
  )
  const { data: thread, error: threadError, refetch: refetchThread } =
    useResource(fetchThread, [conversationId], { pollMs: 5000 })

  const threads = listData?.threads ?? []
  const messages = thread?.messages ?? []
  const standing = thread?.standing ?? null
  const driver = thread?.driver ?? null
  const awaitingReply = thread?.awaitingReply ?? false

  // Declared BELOW `messages` on purpose. An auto-scroll effect that
  // referenced it above its own const blanked this whole app once already
  // (2026-09-08, BrokerChat) — a temporal dead zone throws at render and
  // takes the tree with it.
  const bodyRef = useRef(null)
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, awaitingReply])

  async function onOpen(row) {
    setSendError('')
    try {
      if (row.conversationId) {
        setConversationId(row.conversationId)
        return
      }
      const opened = await openConversation(row.driverId)
      setConversationId(opened.conversation.id)
      refetchList()
    } catch (err) {
      setSendError(err?.message || 'Could not open that conversation.')
    }
  }

  async function onSend(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || sending || !conversationId) return
    setSending(true)
    setSendError('')
    try {
      await sendMessage(conversationId, text)
      setDraft('')
      refetchThread()
      refetchList()
    } catch (err) {
      // Loudly wrong. A message that vanished without a word would look
      // exactly like one the driver is ignoring.
      const code = err instanceof ApiError ? err.code : null
      setSendError(
        code === 'DRIVER_UNREACHABLE'
          ? 'Cannot reach the driver right now. Try again in a moment.'
          : chatLimitMessage(err)
            ?? (err?.message || 'Could not send that.'),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="dc-page">
      <TelegramPanel status={tgStatus} onRefresh={refetchTgStatus} />
      <div className="dc-list">
        <div className="dc-list-head">Drivers</div>
        <div className="dc-list-body">
          {listLoading && !listData && <div className="dc-empty">Loading…</div>}
          {listError && !listData && <div className="dc-empty">Could not load drivers</div>}
          {listData && threads.length === 0 && (
            <div className="dc-empty" style={{ padding: 24 }}>
              No drivers on the roster. Hire one in HR.
            </div>
          )}
          {threads.map((row) => (
            <button
              key={row.driverId}
              className={'dc-item' + (row.conversationId === conversationId ? ' active' : '')}
              onClick={() => onOpen(row)}
            >
              <div className="dc-item-name">{row.driverName}</div>
              <div className="dc-item-last">
                {row.lastContent
                  ? `${row.lastRole === 'driver' ? '' : 'You: '}${row.lastContent}`
                  : 'No messages yet'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="dc-thread">
        {!conversationId && (
          <div className="page-empty">
            <ChatCircle size={32} weight="thin" style={{ opacity: 0.3 }} />
            <div style={{ marginTop: 12 }}>Pick a driver.</div>
          </div>
        )}

        {conversationId && (
          <>
            <div className="dc-thread-head">
              <div className="dc-thread-name">{driver?.name ?? '…'}</div>
              <div className="dc-thread-sub">
                {driver?.truckId ? `Truck ${driver.truckId}` : 'No truck assigned'}
                {thread?.load && ` · running load ${thread.load.id}`}
              </div>
            </div>

            {/* What they are owed, beside what they are saying about it.
                Facts only — the amount and the number of days. No colour,
                no icon: how late it is IS the severity. */}
            {standing && standing.unpaidCount > 0 && (
              <div className="dc-standing">
                <span className="mono">{money(standing.owedUsd)}</span> owed across{' '}
                {standing.unpaidCount} settlement{standing.unpaidCount === 1 ? '' : 's'}
                {standing.daysOverdue > 0 && `, oldest ${standing.daysOverdue} days past due`}
                {STAGE_LINE[standing.stage] && ` — ${STAGE_LINE[standing.stage]}`}
                {!standing.willWork && (
                  <Link to="/finance/settlements" className="dc-standing-link">
                    Run payroll →
                  </Link>
                )}
              </div>
            )}

            <div className="dc-thread-body" ref={bodyRef}>
              {/* A failed read is not an empty conversation. Without this
                  a deleted thread or a 500 rendered "Nothing sent yet."
                  forever with the composer still enabled, and the
                  dispatcher only learned something was wrong after typing
                  a message and watching it fail. */}
              {threadError && !thread && (
                <div className="dc-empty" role="alert" style={{ padding: 24 }}>
                  Could not open this conversation — {threadError.message}
                </div>
              )}
              {!threadError && messages.length === 0 && !awaitingReply && (
                <div className="dc-empty" style={{ padding: 24 }}>
                  Nothing sent yet.
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={'dc-msg ' + m.role}>
                  {m.content}
                  {/* Written when the send failed five times and 046's
                      CHECK stopped counting: the words are in the thread,
                      the group never saw them. Silent would look like
                      silence from the driver. */}
                  {m.role === 'driver' && m.notDelivered && (
                    <div className="dc-undelivered">Not delivered to Telegram</div>
                  )}
                </div>
              ))}
              {awaitingReply && (
                <div className="dc-waiting">
                  {driver?.dutyStatus === 'driving'
                    ? 'Driving — will answer at the next stop'
                    : 'Typing…'}
                </div>
              )}
            </div>

            <form className="dc-thread-footer" onSubmit={onSend}>
              {sendError && <div className="dc-send-error" role="alert">{sendError}</div>}
              <div className="dc-composer">
                <input
                  className="dc-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message the driver…"
                  maxLength={4000}
                  disabled={sending}
                />
                <button
                  className="dc-send"
                  type="submit"
                  disabled={sending || !draft.trim() || Boolean(threadError && !thread)}
                >
                  <PaperPlaneTilt size={16} weight="fill" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
