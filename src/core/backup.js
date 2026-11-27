import { DEFAULT_CONFIG, UNASSIGNED_COLLEGE } from './rules.js'
import { isValidState } from './seed.js'
import { toLocal } from './time.js'

export const BACKUP_APP = 'jingyuan-studyroom'
export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export function backupSummary(state) {
  return {
    users: state.users.length,
    rooms: state.rooms.length,
    seats: state.seats.length,
    bookings: state.bookings.length,
    violations: state.violations.length,
    blacklist: state.blacklist.length,
    logs: state.logs.length,
    clock: toLocal(state.clock.base, true)
  }
}

export function createBackup(state, now = Date.now()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: toLocal(now, true),
    summary: backupSummary(state),
    data: { ...state, session: null }
  }
}

export function backupJson(state, now = Date.now()) {
  return JSON.stringify(createBackup(state, now), null, 2)
}

function normalizeState(raw) {
  const state = { ...raw }
  state.config = { ...DEFAULT_CONFIG, ...(state.config || {}) }
  state.loginAttempts = state.loginAttempts || {}
  state.flags = state.flags || { lastSweep: null }
  state.authSync = {
    lastAt: null, created: 0, updated: 0, skipped: 0, handled: 0,
    exceptions: [], resolved: {}, operator: null, ...(state.authSync || {})
  }
  state.users = (state.users || []).map((user) => ({
    ...user,
    college: user.college || (user.role === 'STUDENT' ? user.dept || UNASSIGNED_COLLEGE : UNASSIGNED_COLLEGE),
    className: user.className || ''
  }))
  state.bookings = (state.bookings || []).map((booking) => ({
    ...booking,
    note: booking.note || '',
    proxy: Boolean(booking.proxy)
  }))
  state.authSync.resolved = state.authSync.resolved || {}
  state.authSync.exceptions = Array.isArray(state.authSync.exceptions) ? state.authSync.exceptions : []
  state.session = null
  return state
}

export function parseBackup(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('备份文件为空或无法读取。')
  if (text.length > MAX_BACKUP_BYTES) throw new Error('备份文件过大，无法导入。')
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('不是有效的 JSON 文件，请选择由本系统导出的备份。')
  }
  if (!payload || typeof payload !== 'object') throw new Error('备份文件格式不正确。')
  let raw = payload
  let exportedAt = ''
  if (payload.app === BACKUP_APP) {
    if (payload.version !== BACKUP_VERSION) throw new Error('备份文件版本不兼容，请使用当前版本导出的文件。')
    raw = payload.data
    exportedAt = payload.exportedAt || ''
  }
  if (!isValidState(raw)) throw new Error('备份内容不完整或已损坏，无法导入。')
  const state = normalizeState(raw)
  return { state, exportedAt, summary: backupSummary(state) }
}
