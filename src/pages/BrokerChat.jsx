import { useState, useEffect, useCallback, useRef } from 'react'
import { standingMessage } from '../utils/companyStanding'
import { chatLimitMessage } from '../utils/chatBudget.js'
import { carrierCheckMessage } from '../utils/carrierCheck.js'
import { Link, useSearchParams } from 'react-router-dom'
import { ChatCircle, DownloadSimple, FileText, CheckCircle } from '@phosphor-icons/react'
import {
  listConversations,
  openConversation,
  openLoadConversation,
  getThread,
  sendMessage,
  acceptRateCon,
  downloadRateConfirmation,
} from '../api/brokerChat'
import { getCarrier } from '../api/carrier'
import { BROKER_EMAIL_COPY, emailShareText } from '../components/brokerChat/emailShare.js'
import { ApiError } from '../api/client'
import { useResource } from '../hooks/useResource'
import { formatMoney } from '../utils/format'
import { talkSummary } from '../components/brokerChat/talkSummary'
import { canSendBrokerMessage, BOOKED_BAR_COPY } from '../components/brokerChat/sendGate.js'
import '../components/dashboard/Panel.css'
import './BrokerChat.css'

// Every failure here used to end at console.error, so a rejected rate or a
// dead provider looked identical to nothing happening — the button simply
// stopped spinning. Errors are matched on ApiError.code, never on message
// text, and the server's own wording is kept where it carries detail the
// client cannot reconstruct (RATE_OUT_OF_BAND names the allowed range).
// Warnings ride back with the accept. They are facts about the fleet at
// the moment the load was created, not a verdict on the decision — the
// dispatcher has already committed; this is what they now have to solve.
const WARNING_TEXT = {
  'no-matching-equipment': 'No truck in the fleet is set up for this trailer type.',
  'no-available-driver': 'No driver is free for this pickup right now.',
  'tight-pickup-window': 'The nearest driver may not reach this pickup within their remaining hours.',
}

function actionErrorText(err) {
  const code = err instanceof ApiError ? err.code : null
  switch (code) {
    case 'CHAT_DAILY_LIMIT':
      return chatLimitMessage(err) ?? err.message
    // Agreeing or accepting with an MC that is missing or wrong: the broker's
    // own sentence, as the server wrote it.
    case 'CARRIER_NOT_VERIFIED':
      return carrierCheckMessage(err) ?? err.message
    case 'CHAT_UNAVAILABLE':
      return 'The broker cannot be reached right now. Try again in a moment.'
    case 'RATE_OUT_OF_BAND':
      return err.message
    // Accepting a rate confirmation is what books the load, so this is
    // where a company past its line finds out it cannot take the freight.
    // The broker is not refusing — the lender is.
    case 'CREDIT_LINE_EXHAUSTED':
    case 'COMPANY_INSOLVENT':
      return standingMessage(err) ?? err.message
    case 'POSTING_TAKEN':
      return 'This load has already been booked by someone else.'
    case 'POSTING_EXPIRED':
      return 'This load has expired.'
    case 'CONVERSATION_NOT_FOUND':
      return 'This conversation is no longer available.'
    case 'NOT_AGREED_YET':
      return 'Agree on a rate first — the confirmation needs a number on it.'
    case 'RATE_CON_NOT_ARRIVED':
      return 'The broker has not sent the rate confirmation yet.'
    case 'ALREADY_BOOKED':
      return 'This rate confirmation has already been accepted.'
    case 'BROKER_BLOCKED':
      return 'This broker will not take your messages right now.'
    case 'LOAD_HAS_NO_BROKER_THREAD':
      return 'There is no broker conversation for this load.'
    case 'BROKER_UNAVAILABLE':
      return 'This posting has no broker on file.'
    default:
      return err?.message || 'Something went wrong. Please try again.'
  }
}

export default function BrokerChat({ emailCopy = BROKER_EMAIL_COPY, bookedBarCopy = BOOKED_BAR_COPY }) {
  // "Contact broker" on the load board links here with ?posting=<id>. That
  // opens (or reopens) the thread for that posting and selects it, so the
  // dispatcher lands in the conversation instead of a list they then have
  // to search. The param is consumed once and cleared from the URL.
  const [searchParams, setSearchParams] = useSearchParams()
  const postingParam = searchParams.get('posting')
  // "Message the broker" on a load page links here with ?load=<id>.
  const loadParam = searchParams.get('load')
  const openedRef = useRef(null)

  const [selectedId, setSelectedId] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState('')
  const sendInFlight = useRef(false)
  const selectedIdRef = useRef(selectedId)
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  const [downloadingId, setDownloading] = useState(null)
  const downloadInFlight = useRef(new Set())
  const [acceptingId, setAccepting] = useState(null)
  const acceptInFlight = useRef(new Set())
  const downloading = downloadingId === selectedId
  const accepting = acceptingId === selectedId
  const [acceptWarnings, setAcceptWarnings] = useState([])
  const threadEndRef = useRef(null)

  const fetchConversations = useCallback(async (signal) => {
    return await listConversations(signal)
  }, [])

  const { data, error, loading, refetch } = useResource(fetchConversations, [], { pollMs: 15000 })

  // No cancellation flag here, on purpose. The obvious shape -- set
  // `cancelled = true` in the cleanup and bail in .then -- is wrong for a
  // one-shot like this: `setSearchParams` is not a stable identity, so any
  // re-render (the conversation list arriving, for one) re-runs the effect,
  // and the cleanup then cancels the request the FIRST run started. The
  // POST still lands, so the thread gets created, but setSelectedId never
  // fires and the URL never clears -- which is exactly what happened on
  // 2026-09-02: a new conversation appeared in the list with the panel
  // still saying "Select a conversation."
  //
  // openedRef is the guard that actually matters: it makes the request run
  // once per posting id, however many times the effect re-enters.
  useEffect(() => {
    if (!postingParam || openedRef.current === postingParam) return
    openedRef.current = postingParam
    openConversation(postingParam)
      .then((res) => {
        setSelectedId(res.conversation.id)
        refetch()
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setActionError(actionErrorText(err))
      })
      .finally(() => setSearchParams({}, { replace: true }))
  }, [postingParam, refetch, setSearchParams])

  // Same once-only pattern for ?load=<id>, which opens the thread behind a
  // booked load.
  useEffect(() => {
    if (!loadParam || openedRef.current === `load:${loadParam}`) return
    openedRef.current = `load:${loadParam}`
    openLoadConversation(loadParam)
      .then((res) => {
        setSelectedId(res.conversation.id)
        refetch()
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setActionError(actionErrorText(err))
      })
      .finally(() => setSearchParams({}, { replace: true }))
  }, [loadParam, refetch, setSearchParams])

  // The open thread is polled faster than the list, because this is where
  // a delayed reply lands. Six seconds is well under the shortest delay an
  // A-rated broker can draw (20s), so nothing sits visible-but-unshown for
  // long, and the request is one small SELECT.
  const fetchThread = useCallback(
    async (signal) => (selectedId ? await getThread(selectedId, signal) : null),
    [selectedId],
  )
  const { data: thread, refetch: refetchThread } = useResource(fetchThread, [selectedId], { pollMs: 6000 })

  const fetchCarrier = useCallback((signal) => getCarrier(signal), [])
  const { data: carrier } = useResource(fetchCarrier, [], { pollMs: 15000 })

  const conversations = data?.conversations ?? []
  const selected = conversations.find((c) => c.id === selectedId)
  // useResource retains the last value while fetching a different thread.
  // Never offer another broker's email action or document during that gap.
  const currentThread = thread?.conversation?.id === selectedId ? thread : null
  const messages = currentThread?.messages ?? []

  // Auto-scroll has to live BELOW `messages`, not above it. `const` is not
  // hoisted the way `function` is -- reading it earlier in the component
  // body throws "Cannot access 'messages' before initialization", which
  // takes the whole app down to a blank page rather than just breaking
  // this panel.
  useEffect(() => {
    if (messages.length > 0) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])
  const awaitingReply = currentThread?.awaitingReply ?? false
  // The conversation from the thread endpoint is fresher than the list's
  // copy, which can be up to 15 seconds behind.
  const convo = currentThread?.conversation ?? selected

  function reload() {
    refetch()
    refetchThread()
  }

  async function handleSend(text = messageText, isEmailShare = false) {
    const content = text.trim()
    if (!content || sendInFlight.current || !selectedId || currentThread?.blocked) return
    if (isEmailShare && !emailShareText(currentThread?.conversation, carrier, emailCopy, awaitingReply)) return
    const conversationId = selectedId
    sendInFlight.current = true
    setActionError('')
    setSending(true)
    try {
      await sendMessage(conversationId, content)
      if (selectedIdRef.current === conversationId) {
        if (!isEmailShare) setMessageText('')
        reload()
      } else refetch()
    } catch (err) {
      if (selectedIdRef.current === conversationId) setActionError(actionErrorText(err))
    } finally {
      sendInFlight.current = false
      setSending(false)
    }
  }

  // Signing the paper is what creates the load. The rate that lands on it
  // is the rate confirmation's own number, which is not always the number
  // that was agreed — the server reads it from the conversation, so a
  // dispatcher who accepted without opening the PDF finds out here.
  async function handleAccept() {
    if (!selectedId || acceptInFlight.current.has(selectedId)) return
    const conversationId = selectedId
    acceptInFlight.current.add(conversationId)
    setActionError('')
    setAccepting(conversationId)
    try {
      const res = await acceptRateCon(conversationId)
      // A completed signature belongs to its initiating thread, even after navigation.
      if (selectedIdRef.current === conversationId) {
        setAcceptWarnings(res.warnings ?? [])
        reload()
      } else refetch()
    } catch (err) {
      if (selectedIdRef.current === conversationId) setActionError(actionErrorText(err))
    } finally {
      acceptInFlight.current.delete(conversationId)
      setAccepting((current) => current === conversationId ? null : current)
    }
  }

  async function handleDownload(conversationId) {
    if (downloadInFlight.current.has(conversationId)) return
    downloadInFlight.current.add(conversationId)
    setActionError('')
    setDownloading(conversationId)
    try {
      await downloadRateConfirmation(conversationId)
    } catch (err) {
      if (selectedIdRef.current === conversationId) setActionError(actionErrorText(err))
    } finally {
      downloadInFlight.current.delete(conversationId)
      setDownloading((current) => current === conversationId ? null : current)
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
              onClick={() => {
                selectedIdRef.current = c.id
                setSelectedId(c.id)
                setActionError('')
                setAcceptWarnings([])
              }}
            >
              <div className="bc-item-route">
                {c.originCity}, {c.originState} → {c.destinationCity}, {c.destinationState}
              </div>
              <div className="bc-item-broker">{c.brokerName}</div>
              <div className="bc-item-meta">
                {c.status === 'booked'
                  ? 'Booked'
                  : c.awaitingReply
                  ? 'Waiting on the broker'
                  : c.agreedRateUsd
                  ? `Agreed: ${formatMoney(c.agreedRateUsd)}`
                  : `${c.messageCount} messages`}
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
              {messages.length === 0 && !awaitingReply && (
                <div className="bc-empty" style={{ padding: 24 }}>
                  Nothing sent yet. Ask about the lane, the weight, or the rate.
                </div>
              )}

              {messages.map((m) =>
                m.kind === 'rate_con' ? (
                  <div key={m.id} className="bc-ratecon">
                    <div className="bc-ratecon-head">
                      <FileText size={15} weight="fill" />
                      <span>Rate confirmation</span>
                    </div>
                    <div className="bc-ratecon-body">{m.content}</div>
                    <div className="bc-ratecon-actions">
                      <button
                        type="button"
                        className="bc-download-btn"
                        disabled={downloading}
                        onClick={() => handleDownload(selected.id)}
                      >
                        <DownloadSimple size={14} />
                        {downloading ? 'Opening…' : 'Open the document'}
                      </button>
                      {convo?.status === 'agreed' && (
                        <button
                          type="button"
                          className="bc-accept-btn"
                          disabled={accepting}
                          onClick={handleAccept}
                        >
                          {accepting ? 'Signing…' : 'Sign and accept'}
                        </button>
                      )}
                    </div>
                    {/* Deliberately no comparison against the agreed number.
                        Printing "this is $100 below what you agreed" would
                        do the reading for them; the whole reason the
                        document exists is that somebody has to open it. */}
                  </div>
                ) : (
                  // 'in'/'out' are the classes BrokerChat.css already
                  // styles: the broker's words arrive, the dispatcher's go.
                  <div key={m.id} className={`bc-msg ${m.role === 'broker' ? 'in' : 'out'}`}>
                    {m.content}
                  </div>
                ),
              )}

              {awaitingReply && (
                <div className="bc-waiting">
                  Waiting on {selected.brokerContactName || selected.brokerName}…
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="bc-thread-footer">
              {actionError && (
                <div className="bc-action-error" role="alert">{actionError}</div>
              )}
              {convo?.status === 'booked' && (
                <div className="bc-booked-bar">
                  <CheckCircle size={15} weight="fill" />
                  <span>{bookedBarCopy[currentThread?.loadStage] ?? bookedBarCopy.booked}</span>
                  <Link to="/loads" className="bc-booked-link">View loads →</Link>
                </div>
              )}

              {acceptWarnings.length > 0 && convo?.status === 'booked' && (
                <ul className="bc-booked-warnings">
                  {acceptWarnings.map((w, i) => (
                    <li key={i}>{WARNING_TEXT[w] || w}</li>
                  ))}
                </ul>
              )}

              {(() => {
                const summary = talkSummary(currentThread?.talk, convo?.status)
                return summary && (
                  <div className="bc-talk">
                    <div>{summary.raised}</div>
                    {summary.notRaised && <div className="bc-talk-sub">{summary.notRaised}</div>}
                    <div className="bc-talk-sub">{summary.words}</div>
                  </div>
                )
              })()}

              {convo?.status === 'agreed' && (
                <div className="bc-agreed-bar">
                  <span>You agreed: {formatMoney(convo.agreedRateUsd)}</span>
                  {convo.negotiationStage === 'paper_pending' && <span className="bc-agreed-sub">{emailCopy.paperPending}</span>}
                </div>
              )}

              {emailShareText(currentThread?.conversation, carrier, emailCopy, awaitingReply) && (
                <div className="bc-email-share">
                  <span className="bc-email-address">{carrier.effectiveEmail}</span>
                  <button
                    type="button"
                    className="bc-download-btn"
                    disabled={sending || awaitingReply}
                    onClick={() => handleSend(emailShareText(currentThread.conversation, carrier, emailCopy, awaitingReply), true)}
                  >
                    {sending ? emailCopy.sharing : emailCopy.share}
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
                  disabled={!canSendBrokerMessage({ sending, text: messageText, blocked: currentThread?.blocked })}
                  onClick={() => handleSend()}
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
