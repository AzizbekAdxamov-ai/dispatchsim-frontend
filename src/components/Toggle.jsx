import { motion } from 'framer-motion'
import '../pages/Settings.css'

export default function Toggle({ checked, onChange, disabled = false }) {
  return (
    <motion.button
      type="button"
      className={'settings-toggle' + (checked ? ' on' : '')}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.94 }}
    >
      <span className="settings-toggle-knob" />
    </motion.button>
  )
}
