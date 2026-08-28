import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './CallChat.css'

export default function CallChat({ call, onEnd }) {
  const [messages, setMessages] = useState(call.opening ? [{ from: 'them', text: call.opening }] : [])
  const [draft, setDraft] = useState('')

  function send() {
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [...prev, { from: 'me', text }])
    setDraft('')
  }

  return (
    <motion.div
      className="call-chat"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="call-chat-head">
        <div className="call-chat-avatar">{call.initials}</div>
        <div>
          <div className="call-chat-name">{call.name}</div>
          <div className="call-chat-status"><span className="dot"></span>Connected</div>
        </div>
        <button className="call-chat-end" onClick={onEnd}>End</button>
      </div>
      <div className="call-chat-body">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              className={'call-chat-msg ' + m.from}
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="call-chat-input">
        <input
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button className="call-chat-send" onClick={send}>Send</button>
      </div>
    </motion.div>
  )
}
