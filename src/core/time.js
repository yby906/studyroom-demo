// 北京时间工具。系统所有业务时间都按 Asia/Shanghai（UTC+8）解释，
// 与浏览器所在时区无关，便于本地演示与测试保持一致。
export const TZ_OFFSET = '+08:00'
export const MINUTE = 60_000
export const DAY = 86_400_000
export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const pad = (n) => String(n).padStart(2, '0')

export function parseLocal(value) {
  if (value == null || value === '') return NaN
  if (typeof value === 'number') return value
  const text = String(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Date.parse(text + 'T00:00:00' + TZ_OFFSET)
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return Date.parse(text.replace(' ', 'T') + TZ_OFFSET)
  }
  return Date.parse(text)
}

/** 毫秒时间戳 -> `YYYY-MM-DD HH:mm` 或 `YYYY-MM-DD HH:mm:ss`（北京时间） */
export function toLocal(ms, seconds = false) {
  if (!Number.isFinite(ms)) return ''
  const iso = new Date(ms + 8 * 3_600_000).toISOString()
  return seconds ? iso.slice(0, 19).replace('T', ' ') : iso.slice(0, 16).replace('T', ' ')
}

export function localDate(ms) {
  return toLocal(ms).slice(0, 10)
}

export function localTime(ms) {
  return toLocal(ms).slice(11, 16)
}

/** 在日期键上加减天数 */
export function addDays(dateKey, days) {
  const d = new Date(dateKey + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function diffDays(fromKey, toKey) {
  return Math.round((parseLocal(toKey) - parseLocal(fromKey)) / DAY)
}

export function dateList(fromKey, toKey) {
  const list = []
  for (let key = fromKey; key <= toKey; key = addDays(key, 1)) list.push(key)
  return list
}

export function weekdayOf(dateKey) {
  return new Date(dateKey + 'T00:00:00Z').getUTCDay()
}

export function weekdayLabel(dateKey) {
  return WEEKDAYS[weekdayOf(dateKey)]
}

export function humanDate(dateKey) {
  const [, m, d] = dateKey.split('-')
  return `${Number(m)}月${Number(d)}日`
}

export function shortDate(ms) {
  const text = toLocal(ms)
  return text.slice(5, 10)
}

export function timeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function normalizeTime(hhmm) {
  const m = timeToMinutes(hhmm)
  return Number.isFinite(m) ? minutesToTime(m) : ''
}

export function dateTimeAt(dateKey, hhmm) {
  return parseLocal(`${dateKey}T${normalizeTime(hhmm)}`)
}

export function fmtDateTime(value) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 16)
}

export function fmtTime(value) {
  if (!value) return '—'
  const text = String(value)
  if (/^\d{2}:\d{2}/.test(text)) return text.slice(0, 5)
  const ms = parseLocal(text)
  return Number.isFinite(ms) ? localTime(ms) : text
}

export function fmtDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 分钟'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h && m) return `${h} 小时 ${m} 分钟`
  if (h) return `${h} 小时`
  return `${m} 分钟`
}

export function fmtRange(start, end) {
  return `${fmtTime(start)}–${fmtTime(end)}`
}

export function todayKey(now = Date.now()) {
  return localDate(now)
}

export function monthKeyOf(now = Date.now()) {
  return localDate(now).slice(0, 7)
}

export function addMonths(monthKey, delta) {
  const [year, month] = String(monthKey).split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + delta, 1))
  return date.toISOString().slice(0, 7)
}

export function monthLabelOf(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number)
  return `${year} 年 ${month} 月`
}

/** 生成以周一为第一列的 6×7 月历网格，包含前后月份补齐日期 */
export function monthGrid(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const start = new Date(first)
  start.setUTCDate(1 - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    const key = date.toISOString().slice(0, 10)
    return { date: key, day: date.getUTCDate(), inMonth: key.slice(0, 7) === monthKey }
  })
}

export function isoNow(now = Date.now()) {
  return toLocal(now, true)
}

/** 当前分钟向上取整到 step（用于默认时间） */
export function ceilToStep(ms, step = 30) {
  const minutes = Math.ceil((ms + 8 * 3_600_000) / MINUTE)
  const rounded = Math.ceil(minutes / step) * step
  return minutesToTime(rounded % 1440)
}
