// How many loads the board says it found, and how a longer answer is paged.
//
// The count and the rows are two numbers: `total` is every match, the
// table holds one page of them. Saying "48 results" over a shorter table
// reads as rows gone missing (X12, 2026-11-08), so the header says both.
// Plain JavaScript so it is testable without JSX.

// The server refuses a page larger than this (loadBoard.schemas.js).
export const MAX_PAGE_LIMIT = 100
export const PAGE_SIZE = 50

const fmt = (n) => Number(n).toLocaleString('en-US')

// "48 results" when the table holds every match, "Showing 23 of 48" when
// it holds fewer. The radius note is the caller's, kept apart.
export function boardCountLabel({ shown, total }) {
  if (total == null) return '…'
  if (shown < total) return `Showing ${fmt(shown)} of ${fmt(total)}`
  return `${fmt(total)} results`
}

// What "Show more" does. While the page can still grow it raises the
// limit by one step, up to the server's ceiling; beyond that it moves to
// the next page of that ceiling-sized window.
export function nextView({ limit, page }) {
  if (limit < MAX_PAGE_LIMIT) return { limit: Math.min(limit + PAGE_SIZE, MAX_PAGE_LIMIT), page: 1 }
  return { limit, page: page + 1 }
}

// Footer facts for the current view: is there more to fetch, and which
// rows (by position) are on screen.
export function boardPager({ limit, page, total, shown }) {
  const offset = (page - 1) * limit
  return {
    from: shown > 0 ? offset + 1 : 0,
    to: offset + shown,
    hasMore: total != null && offset + shown < total,
    hasPrev: page > 1,
  }
}
