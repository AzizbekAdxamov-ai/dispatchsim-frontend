import { useEffect, useState } from 'react'
import { zoneClocks } from '../../utils/zoneClocks'

// The three US clocks, with the day, and the company's own marked. The
// words and the zone names are utils/zoneClocks.js's; this file is only
// the ticking.
//
// Re-read every 15 seconds: a clock that can be a minute behind is a
// clock someone stops trusting, and a quarter-minute is as stale as a
// minute display can visibly get.
const TICK_MS = 15000

export default function ZoneClocks() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="tz-strip" aria-label="US time zones">
      {zoneClocks(now).map((z) => (
        <div
          className={'tz-item' + (z.company ? ' company' : '')}
          key={z.tz}
          title={`${z.abbr} · ${z.city} · ${z.day}` + (z.company ? ' — company time, every time in this app is on this clock' : '')}
        >
          <span className="tz-time mono">{z.time}</span>
          {/* The abbreviation stays on a narrow bar; the city and day are
              the part that gives way (Topbar.css), and the title above
              always carries all of it. */}
          <span className="tz-zone">
            <span className="tz-abbr">{z.abbr}</span>
            <span className="tz-meta"> · {z.city} · {z.day}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
