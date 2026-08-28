import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { brokerChats } from '../data/mockData'
import '../components/dashboard/Panel.css'
import './BrokerChat.css'

function lastMessage(chat) {
  return chat.messages[chat.messages.length - 1]
}

export default function BrokerChat() {
  const [chats, setChats] = useState(brokerChats)
  const [activeId, setActiveId] = useState(brokerChats[0]?.id)
  const [draft, setDraft] = useState('')
  const bodyRef = useRef(null)

  const active = useMemo(() => chats.find((c) => c.id === activeId), [chats, activeId])

  function sendMessage() {
    const text = draft.trim()
    if (!text || !active) return
    setChats((prev) =>
      prev.map((c) =>
        c.id === active.id
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  dir: 'out',
                  text,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            }
          : c
      )
    )
    setDraft('')
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  return (
    <div className="broker-chat">
      <div className="bc-list">
        <div className="bc-list-head">
          Brokers <span className="panel-count">{chats.length}</span>
        </div>
        <div className="bc-list-body">
          {chats.map((chat) => {
            const last = lastMessage(chat)
            return (
              <button
                key={chat.id}
                className={'bc-list-item' + (chat.id === activeId ? ' active' : '')}
                onClick={() => setActiveId(chat.id)}
              >
                <div className="bc-avatar">
                  {chat.initials}
                  <span className={'bc-presence' + (chat.online ? ' online' : '')} />
                </div>
                <div className="bc-list-item-body">
                  <div className="bc-list-item-top">
                    <div className="bc-list-item-name">{chat.name}</div>
                    <div className="bc-list-item-time">{last?.time}</div>
                  </div>
                  <div className="bc-list-item-preview">
                    {last?.dir === 'out' ? 'You: ' : ''}
                    {last?.text}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bc-thread">
        {active ? (
          <>
            <div className="bc-thread-head">
              <div className="bc-avatar">
                {active.initials}
                <span className={'bc-presence' + (active.online ? ' online' : '')} />
              </div>
              <div>
                <div className="bc-thread-name">{active.name}</div>
                <div className="bc-thread-status">{active.online ? 'Online' : 'Offline'}</div>
              </div>
            </div>

            <div className="bc-thread-body" ref={bodyRef}>
              <AnimatePresence initial={false}>
                {active.messages.map((m, i) => (
                  <motion.div
                    className={'bc-msg ' + m.dir}
                    key={active.id + '-' + i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    {m.loadId && <div className="bc-msg-load">Load #{m.loadId}</div>}
                    {m.text}
                    <div className="bc-msg-time">{m.time}</div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="bc-composer">
              <input
                type="text"
                placeholder={'Message ' + active.name + '...'}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button className="bc-send" onClick={sendMessage} disabled={!draft.trim()}>Send</button>
            </div>
          </>
        ) : (
          <div className="bc-empty">Select a broker to view the conversation.</div>
        )}
      </div>
    </div>
  )
}
