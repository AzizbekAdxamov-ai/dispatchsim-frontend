import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import './AccessModal.css'

// Shows an administrator-issued temporary password exactly once. The parent
// owns the value and clears it on close; nothing here stores or logs it.
// All words arrive in `copy`.
export default function TempPasswordModal({ user, password, copy, onClose }) {
  const [copied, setCopied] = useState(false)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.div
      className="admin-modal-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <motion.div
        className="admin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="temp-password-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <div className="admin-modal-head">
          <div id="temp-password-title" className="admin-modal-name">{copy.title}</div>
          <div className="mono admin-modal-email">{user.name} · {user.email}</div>
        </div>
        <div className="admin-temp-password mono" data-testid="temp-password">{password}</div>
        <div className="admin-temp-password-note">{copy.note}</div>
        <div className="admin-modal-actions">
          <button type="button" className="admin-modal-cancel" onClick={handleCopy}>
            {copied ? copy.copied : copy.copy}
          </button>
          <button type="button" ref={closeRef} className="admin-modal-save" onClick={onClose}>
            {copy.close}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
