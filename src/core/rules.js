import {
  DAY, MINUTE, addDays, dateList, dateTimeAt, fmtTime, isoNow, localDate, localTime,
  minutesToTime, parseLocal, timeToMinutes, toLocal, todayKey, weekdayLabel
} from './time.js'

export const ROLES = {
  STUDENT: { key: 'STUDENT', label: '学生', home: 'seats', hint: '查询座位、预约、签到与签退' },
  ROOM_ADMIN: { key: 'ROOM_ADMIN', label: '自习室管理员', home: 'dashboard', hint: '维护房间与座位、处理违约与报表' },
  LIB_ADMIN: { key: 'LIB_ADMIN', label: '图书馆负责人', home: 'analytics', hint: '查看使用分析与资源利用率' },
  SYS_ADMIN: { key: 'SYS_ADMIN', label: '系统管理员', home: 'dashboard', hint: '账号权限、日志、认证与系统配置' }
}
export const ROLE_KEYS = Object.keys(ROLES)

export const STATUS = {
  WAITING: 'WAITING',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  MISSED: 'MISSED'
}
export const STATUS_LABELS = {
  WAITING: '待签到',
  CHECKED_IN: '使用中',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  MISSED: '已失约'
}
export const ACTIVE_STATUS = ['WAITING', 'CHECKED_IN']
export const SEAT_TYPES = ['标准', '靠窗', '插座', '无障碍']

export const COLLEGES = [
  '计算机科学与技术学院', '软件工程学院', '外国语学院', '数学与统计学院',
  '经济管理学院', '机械与电气工程学院', '人文学院', '生命科学学院'
]
const COLLEGE_SHORT = {
  计算机科学与技术学院: '计科',
  软件工程学院: '软工',
  外国语学院: '外语',
  数学与统计学院: '数统',
  经济管理学院: '经管',
  机械与电气工程学院: '机电',
  人文学院: '人文',
  生命科学学院: '生科'
}
export const UNASSIGNED_COLLEGE = '未分配学院'
export const collegeOf = (user) => user?.college || UNASSIGNED_COLLEGE
export const collegeShort = (name) => COLLEGE_SHORT[name] || String(name || '').replace(/学院$/, '') || UNASSIGNED_COLLEGE
export const classOf = (user) => user?.className || ''

export const DEFAULT_CONFIG = {
  openTime: '08:00',
  closeTime: '22:00',
  minDuration: 30,
  maxDuration: 240,
  advanceDays: 7,
  checkinWindow: 15,
  autoReleaseDelay: 0,
  violationThreshold: 3,
  loginFailLimit: 5,
  loginLockMinutes: 15,
  sessionMinutes: 30
}

export const CONFIG_FIELDS = [
  { key: 'openTime', label: '默认开放时间', type: 'time', hint: '新建自习室默认开放时刻' },
  { key: 'closeTime', label: '默认闭馆时间', type: 'time', hint: '新建自习室默认闭馆时刻' },
  { key: 'minDuration', label: '单次最短预约', type: 'number', min: 30, max: 120, step: 30, unit: '分钟' },
  { key: 'maxDuration', label: '单次最长预约', type: 'number', min: 60, max: 480, step: 30, unit: '分钟' },
  { key: 'advanceDays', label: '可提前预约', type: 'number', min: 1, max: 30, step: 1, unit: '天' },
  { key: 'checkinWindow', label: '签到窗口', type: 'number', min: 5, max: 60, step: 5, unit: '分钟', hint: '须小于最短预约时长' },
  { key: 'autoReleaseDelay', label: '自动释放宽限', type: 'number', min: 0, max: 60, step: 5, unit: '分钟' },
  { key: 'violationThreshold', label: '违约阈值', type: 'number', min: 1, max: 10, step: 1, unit: '次', hint: '达到后系统自动加入黑名单' },
  { key: 'loginFailLimit', label: '登录失败阈值', type: 'number', min: 3, max: 10, step: 1, unit: '次' },
  { key: 'loginLockMinutes', label: '登录锁定时长', type: 'number', min: 5, max: 120, step: 5, unit: '分钟' },
  { key: 'sessionMinutes', label: '会话超时', type: 'number', min: 10, max: 240, step: 10, unit: '分钟' }
]

export const ACTION_LABELS = {
  LOGIN: '登录系统',
  LOGOUT: '退出登录',
  LOGIN_FAIL: '登录失败',
  BOOK: '创建预约',
  PROXY_BOOK: '管理员代订',
  CANCEL: '取消预约',
  CANCEL_ADMIN: '管理员取消预约',
  CHECK_IN: '签到入座',
  CHECK_OUT: '离场签退',
  MISSED: '超时未签到',
  COMPLETED: '时段结束自动完成',
  BLACKLIST: '自动加入黑名单',
  UNBLACKLIST: '解除黑名单',
  ROOM_CREATE: '新增自习室',
  ROOM_UPDATE: '修改自习室',
  ROOM_STATUS: '启停自习室',
  ROOM_DELETE: '删除自习室',
  SEAT_CREATE: '新增座位',
  SEAT_UPDATE: '修改座位',
  SEAT_STATUS: '维护座位',
  SEAT_DELETE: '删除座位',
  CONFIG_UPDATE: '修改系统配置',
  USER_CREATE: '创建账号',
  USER_UPDATE: '修改账号权限',
  USER_UNLOCK: '解锁账号',
  AUTH_SYNC: '统一身份认证同步',
  REPORT_EXPORT: '导出统计报表',
  QUERY: '查询业务数据',
  REGISTER: '注册账号',
  AUTH_EXCEPTION: '处理认证异常',
  BACKUP_EXPORT: '导出数据备份',
  BACKUP_IMPORT: '导入数据备份',
  SESSION_EXPIRE: '会话超时',
  RESET_DEMO: '重置演示数据',
  DEMO_TIME: '调整演示时间'
}

export class RuleError extends Error {
  constructor(message, code = 'RULE') {
    super(message)
    this.name = 'RuleError'
    this.code = code
  }
}

const fail = (message, code) => { throw new RuleError(message, code) }

export const roleLabel = (role) => role === 'SYSTEM' ? '系统任务' : (ROLES[role]?.label || role || '未知角色')

export function clockNow(state) {
  const elapsed = Math.max(0, Date.now() - state.clock.realAt)
  return state.clock.base + elapsed
}

export function userById(state, id) {
  return state.users.find((u) => u.id === Number(id)) || null
}
export function userByName(state, username) {
  return state.users.find((u) => u.username === String(username || '').trim()) || null
}
export function roomById(state, id) {
  return state.rooms.find((r) => r.id === Number(id)) || null
}
export function seatById(state, id) {
  return state.seats.find((s) => s.id === Number(id)) || null
}
export function bookingById(state, id) {
  return state.bookings.find((b) => b.id === Number(id)) || null
}
export function seatsOfRoom(state, roomId) {
  return state.seats.filter((s) => s.roomId === Number(roomId))
}
export function roomsForUser(state, user) {
  return state.rooms.filter((r) => user?.role !== 'STUDENT' || r.enabled)
}
export function roomSeatCount(state, roomId, onlyEnabled = false) {
  return state.seats.filter((s) => s.roomId === Number(roomId) && (!onlyEnabled || s.enabled)).length
}
export function roomLocation(room) {
  if (!room) return ''
  const floor = room.floor ? `${room.floor} 层` : ''
  return [room.campus, room.building, floor].filter(Boolean).join(' · ')
}

export function maskStudentNo(value) {
  const text = String(value || '')
  if (text.length <= 4) return text
  return `${text.slice(0, 4)}${'*'.repeat(Math.max(2, text.length - 6))}${text.slice(-2)}`
}

export function audit(state, actor, action, detail, now, target = '', result = '成功') {
  const entry = {
    id: state.next.log++,
    actorId: actor?.id ?? null,
    actorName: actor?.name ?? '系统任务',
    actorRole: actor?.role ?? 'SYSTEM',
    action,
    target: String(target || ''),
    detail: String(detail || ''),
    result,
    ip: '127.0.0.1',
    createdAt: toLocal(now, true)
  }
  state.logs.push(entry)
  if (state.logs.length > 1500) state.logs.splice(0, state.logs.length - 1500)
  return entry
}

/* ------------------------------- 会话与登录 ------------------------------- */

export function login(state, username, password, nowReal) {
  const name = String(username || '').trim()
  const record = state.loginAttempts[name] || { count: 0, firstAt: 0, lockedUntil: 0 }
  if (record.lockedUntil && nowReal < record.lockedUntil) {
    const minutes = Math.ceil((record.lockedUntil - nowReal) / MINUTE)
    audit(state, null, 'LOGIN_FAIL', `账号 ${name} 处于锁定状态，剩余 ${minutes} 分钟`, nowReal, name, '失败')
    fail(`失败次数过多，账号已锁定，请 ${minutes} 分钟后再试，或联系系统管理员。`, 'LOCKED')
  }
  const user = userByName(state, name)
  const passwordOk = password === (user?.password || '')
  if (!user || !passwordOk) {
    const withinWindow = record.firstAt && nowReal - record.firstAt <= 15 * MINUTE
    const next = {
      count: withinWindow ? record.count + 1 : 1,
      firstAt: withinWindow ? record.firstAt : nowReal,
      lockedUntil: 0
    }
    if (next.count >= state.config.loginFailLimit) {
      next.lockedUntil = nowReal + state.config.loginLockMinutes * MINUTE
      next.count = 0
      next.firstAt = 0
    }
    state.loginAttempts[name] = next
    audit(state, null, 'LOGIN_FAIL', !user ? `账号 ${name} 不存在` : '密码校验失败', nowReal, name, '失败')
    if (next.lockedUntil) fail(`连续认证失败达到 ${state.config.loginFailLimit} 次，账号已锁定 ${state.config.loginLockMinutes} 分钟。`, 'LOCKED')
    const left = Math.max(0, state.config.loginFailLimit - next.count)
    fail(`账号或密码错误，请重试（还可尝试 ${left} 次）。`, 'AUTH')
  }
  if (!user.enabled) {
    audit(state, user, 'LOGIN_FAIL', '账号已被停用', nowReal, name, '失败')
    fail('账号已停用或未分配系统权限，请联系系统管理员。', 'DISABLED')
  }
  if (user.lockedUntil && nowReal < user.lockedUntil) {
    fail('账号已被管理员锁定，请联系系统管理员解锁。', 'LOCKED')
  }
  delete state.loginAttempts[name]
  state.session = {
    username: user.username,
    loginAt: nowReal,
    expiresAt: nowReal + state.config.sessionMinutes * MINUTE
  }
  audit(state, user, 'LOGIN', `${roleLabel(user.role)}登录系统`, nowReal, user.username)
  return user
}

export function sessionUser(state, nowReal) {
  const session = state.session
  if (!session) return null
  const user = userByName(state, session.username)
  if (!user || !user.enabled) {
    state.session = null
    return null
  }
  if (nowReal >= session.expiresAt) {
    audit(state, user, 'SESSION_EXPIRE', '会话超时，需重新登录', nowReal, user.username, '提示')
    state.session = null
    return null
  }
  return user
}

export function touchSession(state, nowReal) {
  if (!state.session) return
  state.session.expiresAt = nowReal + state.config.sessionMinutes * MINUTE
}

export function logout(state, user, nowReal) {
  if (user) audit(state, user, 'LOGOUT', '主动退出登录', nowReal, user.username)
  state.session = null
}

/* ------------------------------- 座位与预约 ------------------------------- */

export function activeBlacklist(state, userId) {
  return state.blacklist.find((b) => b.userId === Number(userId) && b.status === 'ACTIVE') || null
}

export function violationSummary(state, userId) {
  const list = state.violations
    .filter((v) => v.userId === Number(userId))
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return {
    count: list.length,
    threshold: state.config.violationThreshold,
    active: activeBlacklist(state, userId),
    entries: list
  }
}

export function bookingStartMs(booking) {
  return dateTimeAt(booking.date, booking.start)
}
export function bookingEndMs(booking) {
  return dateTimeAt(booking.date, booking.end)
}
export function bookingDeadlineMs(booking) {
  return parseLocal(booking.checkinDeadline)
}
export function bookingDuration(booking) {
  return Math.round((bookingEndMs(booking) - bookingStartMs(booking)) / MINUTE)
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart
}

export function enrichBooking(state, booking) {
  if (!booking) return null
  const seat = seatById(state, booking.seatId)
  const room = roomById(state, booking.roomId || seat?.roomId)
  const user = userById(state, booking.userId)
  return {
    ...booking,
    seatCode: seat?.code || '—',
    seatType: seat?.type || '',
    roomName: room?.name || '—',
    roomLocation: roomLocation(room),
    studentName: user?.name || '—',
    studentUsername: user?.username || '—',
    studentNo: user?.studentNo || '',
    college: collegeOf(user),
    className: classOf(user),
    dept: user?.dept || '',
    proxy: Boolean(booking.proxy),
    operatorName: booking.operatorName || user?.name || '',
    statusLabel: STATUS_LABELS[booking.status] || booking.status,
    duration: bookingDuration(booking),
    startAt: `${booking.date} ${booking.start}`,
    endAt: `${booking.date} ${booking.end}`
  }
}

export function bookingsOfUser(state, userId) {
  return state.bookings
    .filter((b) => b.userId === Number(userId))
    .map((b) => enrichBooking(state, b))
    .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start) || b.id - a.id)
}

export function seatAvailability(state, roomId, date, start, end, userId) {
  const startMs = dateTimeAt(date, start)
  const endMs = dateTimeAt(date, end)
  const seats = seatsOfRoom(state, roomId)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return seats.map((seat) => ({ ...seat, state: seat.enabled ? 'FREE' : 'DISABLED', booking: null, mine: false }))
  }
  const occupied = state.bookings.filter((b) =>
    b.date === date && ACTIVE_STATUS.includes(b.status) &&
    overlaps(startMs, endMs, bookingStartMs(b), bookingEndMs(b))
  )
  return seats.map((seat) => {
    if (!seat.enabled) return { ...seat, state: 'DISABLED', booking: null, mine: false }
    const booking = occupied.find((b) => b.seatId === seat.id) || null
    if (!booking) return { ...seat, state: 'FREE', booking: null, mine: false }
    const mine = booking.userId === Number(userId)
    if (mine) return { ...seat, state: 'MINE', booking, mine: true }
    return {
      ...seat,
      state: booking.status === 'CHECKED_IN' ? 'OCCUPIED' : 'RESERVED',
      booking,
      mine: false
    }
  })
}

export function availableSeatCount(state, roomId, date, start, end, userId) {
  return seatAvailability(state, roomId, date, start, end, userId).filter((s) => s.state === 'FREE').length
}

export function startTimeOptions(state, room, date, now) {
  if (!room) return []
  const open = timeToMinutes(room.openTime)
  const close = timeToMinutes(room.closeTime)
  const step = state.config.minDuration
  const today = todayKey(now)
  if (date < today) return []
  const options = []
  for (let m = open; m <= close - step; m += step) {
    const time = minutesToTime(m)
    const startMs = dateTimeAt(date, time)
    const endMs = startMs + step * MINUTE
    if (date === today) {
      if (startMs < now - 30 * MINUTE) continue
      if (endMs <= now + state.config.checkinWindow * MINUTE) continue
    }
    options.push(time)
  }
  return options
}

export function endTimeOptions(state, room, date, start, now) {
  if (!room || !start) return []
  const open = timeToMinutes(room.openTime)
  const close = timeToMinutes(room.closeTime)
  const step = state.config.minDuration
  const startMin = timeToMinutes(start)
  const today = todayKey(now)
  const options = []
  const maxEnd = Math.min(startMin + state.config.maxDuration, close)
  for (let m = startMin + state.config.minDuration; m <= maxEnd; m += step) {
    const time = minutesToTime(m)
    if (date === today && dateTimeAt(date, time) <= now + state.config.checkinWindow * MINUTE) continue
    options.push(time)
  }
  if (!options.length && maxEnd > startMin && maxEnd <= close && date !== today) options.push(minutesToTime(maxEnd))
  return options
}

export function validateBooking(state, user, input, now, options = {}) {
  const { seatId, date, start, end } = input
  if (activeBlacklist(state, user.id)) {
    fail(options.proxy
      ? '该学生当前在预约黑名单中，不能代订；请先在违约处理中解除黑名单。'
      : '您已被列入预约黑名单，暂不能预约；如有异议请联系自习室管理员。', 'BLACKLIST')
  }
  const seat = seatById(state, seatId)
  if (!seat) fail('请选择有效座位。', 'SEAT')
  const room = roomById(state, seat.roomId)
  if (!room) fail('自习室不存在。', 'ROOM')
  if (!room.enabled) fail('该自习室已暂停开放，暂不能预约。', 'ROOM_CLOSED')
  if (!seat.enabled) fail('该座位正在维修停用，请选择其他座位。', 'SEAT_DISABLED')

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) fail('请选择预约日期。', 'DATE')
  const today = todayKey(now)
  const lastDay = addDays(today, state.config.advanceDays - 1)
  if (date < today) fail('不能预约过去的日期。', 'DATE')
  if (date > lastDay) fail(`最多可提前预约 ${state.config.advanceDays} 天（含今天）。`, 'DATE')

  const startMs = dateTimeAt(date, start)
  const endMs = dateTimeAt(date, end)
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) fail('请选择有效的开始和结束时间。', 'TIME')
  if (endMs <= startMs) fail('预约结束时间必须晚于开始时间。', 'TIME')
  const duration = Math.round((endMs - startMs) / MINUTE)
  if (duration < state.config.minDuration) fail(`单次预约不得短于 ${state.config.minDuration} 分钟。`, 'TIME')
  if (duration > state.config.maxDuration) fail(`单次预约不得超过 ${state.config.maxDuration} 分钟。`, 'TIME')
  const openMin = timeToMinutes(room.openTime)
  const closeMin = timeToMinutes(room.closeTime)
  if (timeToMinutes(start) < openMin || timeToMinutes(end) > closeMin) {
    fail(`预约时间须在该自习室开放时间 ${room.openTime}–${room.closeTime} 内。`, 'TIME')
  }
  if (timeToMinutes(start) % state.config.minDuration !== 0 || timeToMinutes(end) % state.config.minDuration !== 0) {
    fail(`预约时间须按 ${state.config.minDuration} 分钟整点选择。`, 'TIME')
  }
  if (date === today) {
    if (startMs < now - 30 * MINUTE) fail('预约开始时间已过，请选择当前或之后的时段。', 'TIME')
    if (endMs <= now + state.config.checkinWindow * MINUTE) {
      fail('该时段剩余时间不足签到窗口，请选择更晚的时段。', 'TIME')
    }
  }

  const invalidConflict = state.bookings.find((b) =>
    b.userId === user.id && b.date === date && ACTIVE_STATUS.includes(b.status) &&
    overlaps(startMs, endMs, bookingStartMs(b), bookingEndMs(b))
  )
  if (invalidConflict) {
    fail('您在该时段已有未完成预约，请先取消或完成原预约。', 'USER_CONFLICT')
  }
  const seatConflict = state.bookings.find((b) =>
    b.seatId === seat.id && b.date === date && ACTIVE_STATUS.includes(b.status) &&
    overlaps(startMs, endMs, bookingStartMs(b), bookingEndMs(b))
  )
  if (seatConflict) fail('该座位刚被占用，请选择其他座位。', 'SEAT_CONFLICT')

  return { seat, room, startMs, endMs, duration }
}

export function createBooking(state, user, input, now, operator = null) {
  const proxy = Boolean(operator && operator.id !== user.id)
  if (proxy && user.role !== 'STUDENT') fail('只能为学生代订座位。', 'ROLE')
  const { seat, startMs, endMs } = validateBooking(state, user, input, now, { proxy })
  const id = state.next.booking++
  const deadlineBase = Math.max(now, startMs)
  const booking = {
    id,
    code: `R${input.date.slice(2).replace(/-/g, '')}-${String(id).padStart(4, '0')}`,
    userId: user.id,
    seatId: seat.id,
    roomId: seat.roomId,
    date: input.date,
    start: input.start,
    end: input.end,
    status: STATUS.WAITING,
    createdAt: toLocal(now, true),
    checkinDeadline: toLocal(deadlineBase + state.config.checkinWindow * MINUTE, true),
    checkedInAt: null,
    endedAt: null,
    cancelReason: null,
    createdBy: proxy ? operator.id : user.id,
    createdByRole: proxy ? operator.role : user.role,
    operatorName: proxy ? operator.name : user.name,
    proxy,
    note: String(input.note || '').slice(0, 60)
  }
  state.bookings.push(booking)
  const detail = `${roomName(state, seat.roomId)} ${seat.code} · ${input.date} ${input.start}–${input.end}`
  if (proxy) {
    audit(state, operator, 'PROXY_BOOK',
      `代 ${user.name}（${user.studentNo || user.username} · ${collegeShort(collegeOf(user))}）预约 ${detail}`,
      now, booking.code)
  } else {
    audit(state, user, 'BOOK', detail, now, booking.code)
  }
  return enrichBooking(state, booking)
}

function roomName(state, roomId) {
  return roomById(state, roomId)?.name || '自习室'
}

export function cancelBooking(state, user, bookingId, now, reason = '学生主动取消') {
  const booking = bookingById(state, bookingId)
  if (!booking) fail('预约不存在。', 'NOT_FOUND')
  if (booking.userId !== user.id) fail('只能操作本人的预约。', 'FORBIDDEN')
  if (booking.status !== STATUS.WAITING) {
    fail(`该预约当前状态为“${STATUS_LABELS[booking.status]}”，不可取消。`, 'STATUS')
  }
  if (now >= bookingStartMs(booking)) {
    fail('预约已开始，无法取消；如已到馆请签到，如未到馆将由系统按超时未签到处理。', 'STARTED')
  }
  const text = String(reason || '').trim() || '学生主动取消'
  if (text.length > 200) fail('取消原因不能超过 200 字。', 'REASON')
  booking.status = STATUS.CANCELLED
  booking.endedAt = toLocal(now, true)
  booking.cancelReason = text
  const enriched = enrichBooking(state, booking)
  audit(state, user, 'CANCEL', `${enriched.roomName} ${enriched.seatCode} · ${text}`, now, booking.code)
  return enriched
}

export function cancelBookingByAdmin(state, actor, bookingId, now, reason = '管理员代学生取消') {
  if (!actor || actor.role === 'STUDENT') fail('仅管理员可取消学生预约。', 'FORBIDDEN')
  const booking = bookingById(state, bookingId)
  if (!booking) fail('预约不存在。', 'NOT_FOUND')
  if (![STATUS.WAITING, STATUS.CHECKED_IN].includes(booking.status)) {
    fail(`该预约当前状态为“${STATUS_LABELS[booking.status]}”，无需取消。`, 'STATUS')
  }
  const text = String(reason || '').trim() || '管理员代学生取消'
  if (text.length > 200) fail('取消原因不能超过 200 字。', 'REASON')
  const wasInUse = booking.status === STATUS.CHECKED_IN
  booking.status = STATUS.CANCELLED
  booking.endedAt = toLocal(now, true)
  booking.cancelReason = text
  booking.cancelledBy = actor.id
  booking.cancelledByRole = actor.role
  const enriched = enrichBooking(state, booking)
  audit(state, actor, 'CANCEL_ADMIN',
    `取消 ${enriched.studentName}（${enriched.studentNo || enriched.studentUsername}）${enriched.roomName} ${enriched.seatCode}${wasInUse ? '（使用中，座位已释放）' : ''} · ${text}`,
    now, booking.code)
  return enriched
}

export function checkIn(state, user, bookingId, now, channel = 'WEB') {
  const booking = bookingById(state, bookingId)
  if (!booking) fail('预约不存在。', 'NOT_FOUND')
  if (booking.userId !== user.id) fail('只能操作本人的预约。', 'FORBIDDEN')
  if (booking.status !== STATUS.WAITING) {
    fail(`该预约当前状态为“${STATUS_LABELS[booking.status]}”，不可签到。`, 'STATUS')
  }
  const startMs = bookingStartMs(booking)
  const deadlineMs = bookingDeadlineMs(booking)
  if (now < startMs) fail(`尚未到签到时间，请在 ${toLocal(startMs)} 后签到。`, 'TOO_EARLY')
  if (now >= deadlineMs) fail('签到窗口已结束，该预约将被系统按超时未签到处理。', 'EXPIRED')
  booking.status = STATUS.CHECKED_IN
  booking.checkedInAt = toLocal(now, true)
  const enriched = enrichBooking(state, booking)
  audit(state, user, 'CHECK_IN', `${enriched.roomName} ${enriched.seatCode} ${channel === 'QR' ? '扫码签到' : '网页签到'}入座`, now, booking.code)
  return enriched
}

export function checkOut(state, user, bookingId, now) {
  const booking = bookingById(state, bookingId)
  if (!booking) fail('预约不存在。', 'NOT_FOUND')
  if (booking.userId !== user.id) fail('只能操作本人的预约。', 'FORBIDDEN')
  if (booking.status === STATUS.COMPLETED) fail('该预约已完成签退，请勿重复操作。', 'DONE')
  if (booking.status !== STATUS.CHECKED_IN) fail('当前预约不可签退。', 'STATUS')
  booking.status = STATUS.COMPLETED
  booking.endedAt = toLocal(now, true)
  const enriched = enrichBooking(state, booking)
  audit(state, user, 'CHECK_OUT', `${enriched.roomName} ${enriched.seatCode} 离场，座位已释放`, now, booking.code)
  return enriched
}

/* --------------------------- 系统定时任务（幂等） --------------------------- */

function addViolation(state, booking, now) {
  if (state.violations.some((v) => v.bookingId === booking.id)) return null
  const violation = {
    id: state.next.violation++,
    userId: booking.userId,
    bookingId: booking.id,
    type: 'NO_SHOW',
    points: 1,
    createdAt: toLocal(now, true),
    note: '超过签到截止时间仍未签到，座位自动释放'
  }
  state.violations.push(violation)
  return violation
}

export function maybeBlacklist(state, userId, now) {
  const count = state.violations.filter((v) => v.userId === userId).length
  if (count < state.config.violationThreshold) return null
  if (activeBlacklist(state, userId)) return null
  const entry = {
    id: state.next.blacklist++,
    userId,
    status: 'ACTIVE',
    triggeredAt: toLocal(now, true),
    violationCount: count,
    threshold: state.config.violationThreshold,
    reason: `系统自动触发：累计违约 ${count} 次，达到阈值 ${state.config.violationThreshold} 次`,
    releasedAt: null,
    releasedBy: null,
    releaseReason: null
  }
  state.blacklist.push(entry)
  const user = userById(state, userId)
  audit(state, null, 'BLACKLIST', `${user?.name || '学生'} 累计违约 ${count} 次，自动加入黑名单`, now, String(userId))
  return entry
}

export function sweep(state, now) {
  const result = { missed: 0, completed: 0, blacklisted: 0, releasedSeats: 0 }
  const delay = state.config.autoReleaseDelay * MINUTE
  const affected = []
  for (const booking of state.bookings) {
    if (booking.status === STATUS.WAITING) {
      const deadlineMs = bookingDeadlineMs(booking)
      if (now >= deadlineMs + delay) {
        booking.status = STATUS.MISSED
        booking.endedAt = toLocal(deadlineMs, true)
        addViolation(state, booking, deadlineMs)
        const entry = maybeBlacklist(state, booking.userId, deadlineMs)
        if (entry) result.blacklisted++
        result.missed++
        result.releasedSeats++
        affected.push(enrichBooking(state, booking))
        audit(state, null, 'MISSED', `${roomName(state, booking.roomId)} ${seatById(state, booking.seatId)?.code || ''} 超时未签到，座位已释放并入违约记录`, deadlineMs, booking.code)
      }
    } else if (booking.status === STATUS.CHECKED_IN) {
      const endMs = bookingEndMs(booking)
      if (now >= endMs + delay) {
        booking.status = STATUS.COMPLETED
        booking.endedAt = toLocal(endMs, true)
        result.completed++
        result.releasedSeats++
        audit(state, null, 'COMPLETED', `${roomName(state, booking.roomId)} 时段结束，预约自动完成并释放座位`, endMs, booking.code)
      }
    }
  }
  if (result.missed || result.completed) state.flags.lastSweep = toLocal(now, true)
  return { ...result, bookings: affected }
}

/* ------------------------------- 房间与座位 ------------------------------- */

export function saveRoom(state, actor, input, now) {
  const name = String(input.name || '').trim()
  const campus = String(input.campus || '').trim()
  const building = String(input.building || '').trim()
  const floor = Number(input.floor)
  const openTime = String(input.openTime || '')
  const closeTime = String(input.closeTime || '')
  if (!name || name.length > 40) fail('请填写自习室名称（不超过 40 字）。', 'NAME')
  if (!campus || !building) fail('请填写校区与楼栋。', 'LOCATION')
  if (!Number.isInteger(floor) || floor < 1 || floor > 30) fail('楼层须为 1–30 的整数。', 'FLOOR')
  if (!/^\d{2}:\d{2}$/.test(openTime) || !/^\d{2}:\d{2}$/.test(closeTime)) fail('请填写有效的开放时间。', 'HOURS')
  if (timeToMinutes(openTime) >= timeToMinutes(closeTime)) fail('闭馆时间必须晚于开放时间。', 'HOURS')
  if (timeToMinutes(closeTime) - timeToMinutes(openTime) < 60) fail('开放时长不得少于 1 小时。', 'HOURS')
  const duplicate = state.rooms.find((r) => r.name === name && r.id !== Number(input.id))
  if (duplicate) fail('房间名称已存在，请换一个名称。', 'NAME')

  if (input.id) {
    const room = roomById(state, input.id)
    if (!room) fail('自习室不存在。', 'NOT_FOUND')
    Object.assign(room, {
      name,
      campus,
      building,
      floor,
      openTime,
      closeTime,
      description: String(input.description || '').trim().slice(0, 200),
      updatedAt: toLocal(now, true)
    })
    audit(state, actor, 'ROOM_UPDATE', `更新自习室“${name}”基础信息`, now, String(room.id))
    return room
  }

  const rows = Number(input.rows)
  const columns = Number(input.columns)
  if (!Number.isInteger(rows) || rows < 1 || rows > 12) fail('座位行数须为 1–12。', 'ROWS')
  if (!Number.isInteger(columns) || columns < 1 || columns > 12) fail('每行座位数须为 1–12。', 'COLS')
  const room = {
    id: state.next.room++,
    name,
    campus,
    building,
    floor,
    openTime,
    closeTime,
    description: String(input.description || '').trim().slice(0, 200),
    enabled: true,
    createdAt: toLocal(now, true)
  }
  state.rooms.push(room)
  const prefix = String(input.prefix || '').trim().toUpperCase() || String.fromCharCode(64 + Math.min(26, room.id))
  addSeatGrid(state, room.id, rows, columns, prefix, 1)
  audit(state, actor, 'ROOM_CREATE', `创建自习室“${name}”，自动生成 ${rows * columns} 个座位`, now, String(room.id))
  return room
}

function addSeatGrid(state, roomId, rows, columns, prefix, startRow = 1) {
  const existing = seatsOfRoom(state, roomId)
  const maxIndex = existing.reduce((max, seat) => {
    const match = String(seat.code).match(/(\d+)$/)
    return Math.max(max, match ? Number(match[1]) : 0)
  }, 0)
  for (let row = 0; row < rows; row++) {
    for (let col = 1; col <= columns; col++) {
      const index = maxIndex + row * columns + col
      const code = `${prefix}${String(index).padStart(2, '0')}`
      const nearWindow = col === 1 || col === columns
      const hasPower = col % 2 === 0
      const type = row === 0 && col === 1 ? '无障碍' : nearWindow ? '靠窗' : hasPower ? '插座' : '标准'
      state.seats.push({
        id: state.next.seat++,
        roomId,
        code,
        type,
        rowNo: startRow + row,
        colNo: col,
        enabled: true,
        note: ''
      })
    }
  }
}

export function toggleRoom(state, actor, roomId, enabled, now) {
  const room = roomById(state, roomId)
  if (!room) fail('自习室不存在。', 'NOT_FOUND')
  room.enabled = Boolean(enabled)
  audit(state, actor, 'ROOM_STATUS', `${room.enabled ? '开放' : '停用'}自习室“${room.name}”`, now, String(room.id))
  return room
}

export function deleteRoom(state, actor, roomId, now) {
  const room = roomById(state, roomId)
  if (!room) fail('自习室不存在。', 'NOT_FOUND')
  if (state.bookings.some((b) => b.roomId === room.id)) {
    fail('该自习室存在预约记录，不能删除；可改为停用以停止新预约。', 'HAS_BOOKINGS')
  }
  state.rooms = state.rooms.filter((r) => r.id !== room.id)
  state.seats = state.seats.filter((s) => s.roomId !== room.id)
  audit(state, actor, 'ROOM_DELETE', `删除自习室“${room.name}”`, now, String(room.id))
}

export function saveSeat(state, actor, input, now) {
  const code = String(input.code || '').trim()
  if (!code || !/^[A-Za-z0-9-]{1,10}$/.test(code)) fail('座位编号须为 1–10 位字母、数字或连字符。', 'CODE')
  const type = SEAT_TYPES.includes(input.type) ? input.type : '标准'
  if (input.id) {
    const seat = seatById(state, input.id)
    if (!seat) fail('座位不存在。', 'NOT_FOUND')
    if (state.seats.some((s) => s.roomId === seat.roomId && s.id !== seat.id && s.code.toLowerCase() === code.toLowerCase())) {
      fail('该房间内座位编号已存在。', 'CODE')
    }
    seat.code = code
    seat.type = type
    if (typeof input.enabled === 'boolean') seat.enabled = input.enabled
    audit(state, actor, 'SEAT_UPDATE', `更新座位 ${code}（${type}）`, now, String(seat.id))
    return seat
  }
  const room = roomById(state, input.roomId)
  if (!room) fail('目标房间不存在。', 'ROOM')
  if (state.seats.some((s) => s.roomId === room.id && s.code.toLowerCase() === code.toLowerCase())) {
    fail('该房间内座位编号已存在。', 'CODE')
  }
  const seats = seatsOfRoom(state, room.id)
  const lastRow = seats.reduce((max, s) => Math.max(max, s.rowNo), 0) || 1
  const lastCol = seats.filter((s) => s.rowNo === lastRow).length
  const seat = {
    id: state.next.seat++,
    roomId: room.id,
    code,
    type,
    rowNo: lastRow,
    colNo: lastCol + 1,
    enabled: input.enabled !== false,
    note: ''
  }
  state.seats.push(seat)
  audit(state, actor, 'SEAT_CREATE', `在“${room.name}”新增座位 ${code}`, now, String(seat.id))
  return seat
}

export function setSeatEnabled(state, actor, seatId, enabled, now) {
  const seat = seatById(state, seatId)
  if (!seat) fail('座位不存在。', 'NOT_FOUND')
  seat.enabled = Boolean(enabled)
  const room = roomById(state, seat.roomId)
  audit(state, actor, 'SEAT_STATUS', `${enabled ? '启用' : '维修停用'}${room?.name || ''} ${seat.code}`, now, String(seat.id))
  return seat
}

export function deleteSeat(state, actor, seatId, now) {
  const seat = seatById(state, seatId)
  if (!seat) fail('座位不存在。', 'NOT_FOUND')
  if (state.bookings.some((b) => b.seatId === seat.id)) {
    fail('该座位存在预约记录，不能删除；可标记为维修停用。', 'HAS_BOOKINGS')
  }
  state.seats = state.seats.filter((s) => s.id !== seat.id)
  audit(state, actor, 'SEAT_DELETE', `删除座位 ${seat.code}`, now, String(seat.id))
}

export function batchSeats(state, actor, roomId, rows, columns, prefix, now) {
  const room = roomById(state, roomId)
  if (!room) fail('目标房间不存在。', 'ROOM')
  if (!Number.isInteger(rows) || rows < 1 || rows > 12 || !Number.isInteger(columns) || columns < 1 || columns > 12) {
    fail('行列数须为 1–12 的整数。', 'SHAPE')
  }
  const seats = seatsOfRoom(state, room.id)
  const lastRow = seats.reduce((max, s) => Math.max(max, s.rowNo), 0)
  const cleanPrefix = String(prefix || '').trim().toUpperCase()
  if (!/^[A-Z]{0,2}$/.test(cleanPrefix)) fail('座位前缀须为 0–2 位字母。', 'PREFIX')
  addSeatGrid(state, room.id, rows, columns, cleanPrefix || 'S', lastRow + 1)
  audit(state, actor, 'SEAT_CREATE', `在“${room.name}”批量生成 ${rows * columns} 个座位`, now, String(room.id))
}

/* ------------------------------- 黑名单与账号 ------------------------------- */

export function unblacklist(state, actor, userId, reason, now) {
  const entry = activeBlacklist(state, userId)
  if (!entry) fail('该学生当前不在黑名单中。', 'NOT_BLACKLISTED')
  const text = String(reason || '').trim()
  if (text.length < 2) fail('请填写解除原因与依据。', 'REASON')
  if (text.length > 200) fail('解除原因不能超过 200 字。', 'REASON')
  entry.status = 'RELEASED'
  entry.releasedAt = toLocal(now, true)
  entry.releasedBy = actor.id
  entry.releaseReason = text
  audit(state, actor, 'UNBLACKLIST', `解除 ${userById(state, userId)?.name || ''} 的黑名单：${text}`, now, String(userId))
  return entry
}

export function registerUser(state, input, now) {
  const username = String(input.username || '').trim()
  const name = String(input.name || '').trim()
  const password = String(input.password || '')
  const studentNo = String(input.studentNo || '').trim()
  const dept = String(input.dept || '').trim()
  const college = String(input.college || '').trim()
  const className = String(input.className || '').trim()
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) fail('登录名须为 3–20 位字母、数字或下划线。', 'USERNAME')
  if (!name || name.length < 2 || name.length > 20) fail('请填写姓名（2–20 字）。', 'NAME')
  if (password.length < 6 || password.length > 40) fail('密码须为 6–40 位字符。', 'PASSWORD')
  if (userByName(state, username)) fail('该登录名已被使用，请更换。', 'DUP')
  if (studentNo && !/^[A-Za-z0-9-]{3,20}$/.test(studentNo)) fail('学号须为 3–20 位字母、数字或连字符。', 'STUDENT_NO')
  if (dept.length > 40) fail('院系名称不能超过 40 字。', 'DEPT')
  if (college.length > 40) fail('学院名称不能超过 40 字。', 'COLLEGE')
  if (className.length > 20) fail('班级不能超过 20 字。', 'CLASS')
  const user = {
    id: state.next.user++,
    username,
    password,
    name,
    role: 'STUDENT',
    studentNo,
    dept: dept || '未填写院系',
    college: college || UNASSIGNED_COLLEGE,
    className,
    enabled: true,
    lockedUntil: 0,
    failCount: 0,
    createdAt: toLocal(now, true)
  }
  state.users.push(user)
  audit(state, { id: user.id, name: user.name, role: user.role }, 'REGISTER',
    `新用户注册：${name}（${username} · ${collegeShort(user.college)}${className ? ` · ${className}` : ''}）`,
    now, String(user.id))
  return user
}

export function createUser(state, actor, input, now) {
  const username = String(input.username || '').trim()
  const name = String(input.name || '').trim()
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) fail('账号须为 3–20 位字母、数字或下划线。', 'USERNAME')
  if (!name || name.length > 20) fail('请填写姓名（不超过 20 字）。', 'NAME')
  if (!ROLE_KEYS.includes(input.role)) fail('请选择有效角色。', 'ROLE')
  if (userByName(state, username)) fail('账号已存在，请更换。', 'DUP')
  const user = {
    id: state.next.user++,
    username,
    password: 'Study@2026',
    name,
    role: input.role,
    studentNo: String(input.studentNo || '').trim(),
    dept: String(input.dept || '').trim() || '未分配院系',
    college: String(input.college || '').trim() || UNASSIGNED_COLLEGE,
    className: String(input.className || '').trim().slice(0, 20),
    enabled: true,
    lockedUntil: 0,
    failCount: 0,
    createdAt: toLocal(now, true)
  }
  state.users.push(user)
  audit(state, actor, 'USER_CREATE', `创建 ${roleLabel(user.role)}账号 ${username}（${name}）`, now, String(user.id))
  return user
}

export function updateUser(state, actor, userId, patch, now) {
  const user = userById(state, userId)
  if (!user) fail('账号不存在。', 'NOT_FOUND')
  if (user.username === 'sysadmin' && (patch.role && patch.role !== 'SYS_ADMIN' || patch.enabled === false)) {
    fail('最高权限账号不可修改或停用。', 'PROTECTED')
  }
  if (user.id === actor.id && patch.enabled === false) fail('不能停用当前登录的账号。', 'SELF')
  const before = `${roleLabel(user.role)} · ${user.enabled ? '启用' : '停用'}`
  if (patch.role) {
    if (!ROLE_KEYS.includes(patch.role)) fail('角色不合法。', 'ROLE')
    user.role = patch.role
  }
  if (typeof patch.enabled === 'boolean') user.enabled = patch.enabled
  if (typeof patch.name === 'string' && patch.name.trim()) user.name = patch.name.trim().slice(0, 20)
  if (typeof patch.dept === 'string') user.dept = patch.dept.trim().slice(0, 40)
  if (typeof patch.college === 'string') user.college = patch.college.trim().slice(0, 40) || UNASSIGNED_COLLEGE
  if (typeof patch.className === 'string') user.className = patch.className.trim().slice(0, 20)
  if (typeof patch.studentNo === 'string') user.studentNo = patch.studentNo.trim().slice(0, 20)
  if (patch.enabled === false) state.session = state.session?.username === user.username ? null : state.session
  const after = `${roleLabel(user.role)} · ${user.enabled ? '启用' : '停用'}`
  audit(state, actor, 'USER_UPDATE', `账号 ${user.username} 权限/状态：${before} → ${after}`, now, String(user.id))
  return user
}

export function unlockUser(state, actor, userId, now) {
  const user = userById(state, userId)
  if (!user) fail('账号不存在。', 'NOT_FOUND')
  user.lockedUntil = 0
  user.failCount = 0
  delete state.loginAttempts[user.username]
  audit(state, actor, 'USER_UNLOCK', `解锁账号 ${user.username} 并清零失败次数`, now, String(user.id))
  return user
}

/* ------------------------------- 系统配置 ------------------------------- */

export function saveConfig(state, actor, patch, now) {
  const before = { ...state.config }
  const next = { ...state.config }
  for (const field of CONFIG_FIELDS) {
    if (!(field.key in patch)) continue
    if (field.type === 'time') {
      const value = String(patch[field.key] || '')
      if (!/^\d{2}:\d{2}$/.test(value)) fail(`${field.label}格式不正确。`, field.key)
      next[field.key] = value
    } else {
      const value = Number(patch[field.key])
      if (!Number.isFinite(value)) fail(`${field.label}必须为数字。`, field.key)
      if (value < field.min || value > field.max) fail(`${field.label}须在 ${field.min}–${field.max} 之间。`, field.key)
      if (field.step && value % field.step !== 0) fail(`${field.label}须为 ${field.step} 的整数倍。`, field.key)
      next[field.key] = value
    }
  }
  if (next.openTime >= next.closeTime) fail('默认闭馆时间必须晚于开放时间。', 'openTime')
  if (next.maxDuration < next.minDuration) fail('单次最长预约不得小于最短预约。', 'maxDuration')
  if (next.checkinWindow >= next.minDuration) fail('签到窗口必须小于单次最短预约时长，避免窗口跨越整个时段。', 'checkinWindow')
  state.config = next
  const changes = CONFIG_FIELDS
    .filter((f) => before[f.key] !== next[f.key])
    .map((f) => `${f.label}：${before[f.key]} → ${next[f.key]}`)
  if (changes.length) audit(state, actor, 'CONFIG_UPDATE', changes.join('；'), now)
  return { config: next, changes }
}

/* ------------------------------- 统计分析 ------------------------------- */

export function roomOpenHours(room) {
  return Math.max(0, (timeToMinutes(room.closeTime) - timeToMinutes(room.openTime)) / 60)
}

function bookingDurationInRoom(booking, room) {
  const start = Math.max(timeToMinutes(booking.start), timeToMinutes(room.openTime))
  const end = Math.min(timeToMinutes(booking.end), timeToMinutes(room.closeTime))
  return Math.max(0, end - start) / 60
}

export function buildStats(state, options = {}) {
  const now = options.now ?? clockNow(state)
  const today = todayKey(now)
  const to = options.to || today
  const from = options.from || addDays(to, -6)
  const roomId = options.roomId ? Number(options.roomId) : 0
  const college = options.college && options.college !== 'ALL' ? String(options.college).trim() : ''
  const selectedRooms = state.rooms.filter((r) => !roomId || r.id === roomId)
  const days = dateList(from, to).filter((d) => d <= today)
  const studentById = new Map(state.users.map((u) => [u.id, u]))
  const collegeOfBooking = (b) => collegeOf(studentById.get(b.userId))
  const scopeBookings = state.bookings.filter((b) =>
    b.date >= from && b.date <= to && (!roomId || b.roomId === roomId) && b.date <= today
  )
  const bookings = scopeBookings.filter((b) => !college || collegeOfBooking(b) === college)
  const total = bookings.length
  const completed = bookings.filter((b) => b.status === STATUS.COMPLETED).length
  const cancelled = bookings.filter((b) => b.status === STATUS.CANCELLED).length
  const missed = bookings.filter((b) => b.status === STATUS.MISSED).length
  const waiting = bookings.filter((b) => b.status === STATUS.WAITING).length
  const checkedIn = bookings.filter((b) => b.status === STATUS.CHECKED_IN).length
  const attended = bookings.filter((b) => Boolean(b.checkedInAt)).length
  const ended = completed + missed
  const checkinBase = completed + missed + checkedIn
  const checkinRate = checkinBase ? Math.min(1, attended / checkinBase) : 0
  const cancelRate = total ? cancelled / total : 0
  const violationRate = total ? missed / total : 0
  const durations = bookings.filter((b) => b.status !== STATUS.CANCELLED && b.status !== STATUS.MISSED)
  const avgDuration = durations.length
    ? durations.reduce((sum, b) => sum + bookingDuration(b), 0) / durations.length
    : 0

  const seatHours = selectedRooms
    .filter((room) => room.enabled || (roomId && room.id === roomId))
    .reduce((sum, room) => sum + roomSeatCount(state, room.id) * roomOpenHours(room), 0)
  const dayCount = Math.max(1, days.length)
  const bookedHours = bookings
    .filter((b) => b.status !== STATUS.CANCELLED && b.status !== STATUS.MISSED)
    .reduce((sum, b) => sum + bookingDurationInRoom(b, roomById(state, b.roomId) || { openTime: '08:00', closeTime: '22:00' }), 0)
  const utilization = Math.min(1, seatHours ? bookedHours / (seatHours * dayCount) : 0)

  const hours = new Set()
  selectedRooms.forEach((room) => {
    const start = timeToMinutes(room.openTime)
    const end = timeToMinutes(room.closeTime)
    for (let h = Math.floor(start / 60); h < Math.ceil(end / 60); h++) hours.add(h)
  })
  const hourList = [...hours].sort((a, b) => a - b)
  const byHour = hourList.map((hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}:00`,
    value: bookings.filter((b) => Number(b.start.slice(0, 2)) === hour).length
  }))
  const peak = byHour.reduce((best, item) => (item.value > best.value ? item : best), { value: 0, label: '—' })

  const byDay = days.map((day) => {
    const dayBookings = bookings.filter((b) => b.date === day)
    const dayAttended = dayBookings.filter((b) => Boolean(b.checkedInAt)).length
    const dayMissed = dayBookings.filter((b) => b.status === STATUS.MISSED).length
    const dayCancelled = dayBookings.filter((b) => b.status === STATUS.CANCELLED).length
    const dayHours = dayBookings
      .filter((b) => b.status !== STATUS.CANCELLED && b.status !== STATUS.MISSED)
      .reduce((sum, b) => sum + bookingDurationInRoom(b, roomById(state, b.roomId) || { openTime: '08:00', closeTime: '22:00' }), 0)
    return {
      date: day,
      weekday: weekdayLabel(day),
      total: dayBookings.length,
      attended: dayAttended,
      missed: dayMissed,
      cancelled: dayCancelled,
      utilization: Math.min(1, seatHours ? dayHours / seatHours : 0)
    }
  })

  const byRoom = selectedRooms.map((room) => {
    const roomBookings = bookings.filter((b) => b.roomId === room.id)
    const seatCount = roomSeatCount(state, room.id)
    const roomHours = roomBookings
      .filter((b) => b.status !== STATUS.CANCELLED && b.status !== STATUS.MISSED)
      .reduce((sum, b) => sum + bookingDurationInRoom(b, room), 0)
    return {
      roomId: room.id,
      name: room.name,
      enabled: room.enabled,
      total: roomBookings.length,
      attended: roomBookings.filter((b) => Boolean(b.checkedInAt)).length,
      missed: roomBookings.filter((b) => b.status === STATUS.MISSED).length,
      cancelled: roomBookings.filter((b) => b.status === STATUS.CANCELLED).length,
      seatCount,
      utilization: seatCount && days.length ? Math.min(1, roomHours / (seatCount * roomOpenHours(room) * days.length)) : 0
    }
  })

  const collegeNames = [...new Set([
    ...state.users.filter((u) => u.role === 'STUDENT').map((u) => collegeOf(u)),
    ...scopeBookings.map((b) => collegeOfBooking(b))
  ])].sort()
  const collegeHours = (list) => list
    .filter((b) => b.status !== STATUS.CANCELLED && b.status !== STATUS.MISSED)
    .reduce((sum, b) => sum + bookingDurationInRoom(b, roomById(state, b.roomId) || { openTime: '08:00', closeTime: '22:00' }), 0)
  const scopeHours = collegeHours(bookings)
  const collegeGroupsFiltered = new Map()
  for (const b of bookings) {
    const name = collegeOfBooking(b)
    if (!collegeGroupsFiltered.has(name)) collegeGroupsFiltered.set(name, [])
    collegeGroupsFiltered.get(name).push(b)
  }
  const byCollege = [...collegeGroupsFiltered.entries()].map(([name, list]) => {
    const attended = list.filter((b) => Boolean(b.checkedInAt)).length
    const collegeMissed = list.filter((b) => b.status === STATUS.MISSED).length
    const collegeCancelled = list.filter((b) => b.status === STATUS.CANCELLED).length
    const collegeCompleted = list.filter((b) => b.status === STATUS.COMPLETED).length
    const collegeCheckedIn = list.filter((b) => b.status === STATUS.CHECKED_IN).length
    const base = collegeCompleted + collegeMissed + collegeCheckedIn
    const hours = collegeHours(list)
    return {
      college: name,
      short: collegeShort(name),
      students: state.users.filter((u) => u.role === 'STUDENT' && collegeOf(u) === name).length,
      total: list.length,
      completed: collegeCompleted,
      checkedIn: collegeCheckedIn,
      attended,
      missed: collegeMissed,
      cancelled: collegeCancelled,
      checkinRate: base ? Math.min(1, attended / base) : 0,
      cancelRate: list.length ? collegeCancelled / list.length : 0,
      violationRate: list.length ? collegeMissed / list.length : 0,
      hours: Number(hours.toFixed(1)),
      share: scopeHours ? hours / scopeHours : 0,
      utilization: Math.min(1, seatHours ? hours / (seatHours * dayCount) : 0)
    }
  }).sort((a, b) => b.total - a.total || b.hours - a.hours)

  const classGroups = new Map()
  for (const b of bookings) {
    const student = studentById.get(b.userId)
    if (!student) continue
    const key = `${collegeOf(student)}|${classOf(student) || '未分班'}`
    if (!classGroups.has(key)) {
      classGroups.set(key, { college: collegeOf(student), className: classOf(student) || '未分班', total: 0, attended: 0, missed: 0, cancelled: 0 })
    }
    const row = classGroups.get(key)
    row.total++
    if (b.checkedInAt) row.attended++
    if (b.status === STATUS.MISSED) row.missed++
    if (b.status === STATUS.CANCELLED) row.cancelled++
  }
  const byClass = [...classGroups.values()]
    .map((row) => ({ ...row, checkinRate: row.total ? row.attended / row.total : 0 }))
    .sort((a, b) => b.total - a.total)

  const violationByType = [{ type: '超时未签到', value: missed }]

  const heatCols = ['08–12', '12–16', '16–20', '20–22']
  const heatRows = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const weekHeat = heatRows.map(() => heatCols.map(() => 0))
  for (const booking of bookings) {
    const weekdayIndex = (new Date(booking.date + 'T00:00:00Z').getUTCDay() + 6) % 7
    const hour = Number(booking.start.slice(0, 2))
    const band = hour < 12 ? 0 : hour < 16 ? 1 : hour < 20 ? 2 : 3
    weekHeat[weekdayIndex][band]++
  }

  return {
    range: { from, to, days: days.length },
    roomId,
    college,
    colleges: collegeNames,
    total,
    completed,
    cancelled,
    missed,
    waiting,
    checkedIn,
    attended,
    ended,
    checkinRate,
    cancelRate,
    violationRate,
    utilization,
    avgDuration,
    peakHour: peak.label,
    byDay,
    byHour,
    byRoom,
    byCollege,
    byClass,
    violationByType,
    weekHeat,
    heatRows,
    heatCols,
    seatHours,
    bookedHours,
    updatedAt: toLocal(now, true),
    today
  }
}

export function buildReportRows(state, options) {
  const stats = buildStats(state, options)
  return stats.byDay.flatMap((day) =>
    stats.byRoom.map((room) => {
      const dayRoomBookings = state.bookings.filter((b) => b.date === day.date && b.roomId === room.roomId)
      const attended = dayRoomBookings.filter((b) => Boolean(b.checkedInAt)).length
      const missed = dayRoomBookings.filter((b) => b.status === STATUS.MISSED).length
      const cancelled = dayRoomBookings.filter((b) => b.status === STATUS.CANCELLED).length
      const roomEntity = roomById(state, room.roomId)
      const hours = dayRoomBookings
        .filter((b) => b.status !== STATUS.CANCELLED && b.status !== STATUS.MISSED)
        .reduce((sum, b) => sum + bookingDurationInRoom(b, roomEntity), 0)
      const utilization = room.seatCount && roomOpenHours(roomEntity)
        ? Math.min(1, hours / (room.seatCount * roomOpenHours(roomEntity)))
        : 0
      return {
        date: day.date,
        weekday: day.weekday,
        roomName: roomEntity.name,
        total: dayRoomBookings.length,
        attended,
        missed,
        cancelled,
        hours: Number(hours.toFixed(1)),
        utilization: Number((utilization * 100).toFixed(1))
      }
    })
  ).filter((row) => row.total > 0)
}

export function buildCollegeRows(state, options) {
  const stats = buildStats(state, options)
  return stats.byCollege.map((row) => ({
    college: row.college,
    students: row.students,
    total: row.total,
    attended: row.attended,
    missed: row.missed,
    cancelled: row.cancelled,
    checkinRate: Number((row.checkinRate * 100).toFixed(1)),
    hours: row.hours,
    utilization: Number((row.utilization * 100).toFixed(1))
  }))
}

export function buildClassRows(state, options) {
  const stats = buildStats(state, options)
  return stats.byClass.map((row) => ({
    college: row.college,
    className: row.className,
    total: row.total,
    attended: row.attended,
    missed: row.missed,
    cancelled: row.cancelled,
    checkinRate: Number((row.checkinRate * 100).toFixed(1))
  }))
}

export function csvText(headers, rows) {
  const escape = (value) => {
    const text = value == null ? '' : String(value)
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  return '\ufeff' + [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

/* ---------------------------- 统一身份认证同步（模拟） ---------------------------- */

const CAMPUS_ROSTER = [
  { username: '20260201', name: '沈知远', role: 'STUDENT', studentNo: '20260201', dept: '计算机科学与技术学院' },
  { username: '20260202', name: '顾清和', role: 'STUDENT', studentNo: '20260202', dept: '外国语学院' },
  {
    username: '20250118',
    name: '林建安',
    role: 'STUDENT',
    studentNo: '20250118',
    dept: '数学学院',
    exception: '统一认证返回学号 20250118（林建安），与本地预留身份信息不一致，需人工核对后处理'
  }
]

export const AUTH_MODE_LABELS = {
  create: '创建账号并绑定',
  bind: '绑定已有账号',
  ignore: '仅标记已处理'
}

export function simulateAuthSync(state, actor, now) {
  const result = { created: 0, updated: 0, skipped: 0, handled: 0, exceptions: [], at: toLocal(now, true) }
  const resolved = state.authSync?.resolved || {}
  for (const person of CAMPUS_ROSTER) {
    if (person.exception) {
      if (resolved[person.username]) {
        result.handled++
        continue
      }
      result.exceptions.push({
        username: person.username,
        name: person.name,
        dept: person.dept,
        role: person.role,
        message: person.exception
      })
      continue
    }
    const existing = userByName(state, person.username)
    if (!existing) {
      state.users.push({
        id: state.next.user++,
        username: person.username,
        password: 'Study@2026',
        name: person.name,
        role: person.role,
        studentNo: person.studentNo,
        dept: person.dept,
        enabled: true,
        lockedUntil: 0,
        failCount: 0,
        createdAt: toLocal(now, true)
      })
      result.created++
    } else if (existing.name !== person.name || existing.dept !== person.dept) {
      existing.name = person.name
      existing.dept = person.dept
      result.updated++
    } else {
      result.skipped++
    }
  }
  state.authSync = {
    lastAt: result.at,
    created: result.created,
    updated: result.updated,
    skipped: result.skipped,
    handled: result.handled,
    exceptions: result.exceptions,
    resolved,
    operator: actor?.name || '系统任务'
  }
  audit(state, actor, 'AUTH_SYNC', `统一认证同步：新增 ${result.created}，更新 ${result.updated}，异常 ${result.exceptions.length}，已处理 ${result.handled}`, now)
  return result
}

export function resolveAuthException(state, actor, input, now) {
  const username = String(input.username || '').trim()
  const mode = String(input.mode || '')
  const note = String(input.note || '').trim()
  const exceptions = state.authSync?.exceptions || []
  const exception = exceptions.find((item) => item.username === username)
  if (!exception) fail('该认证异常已处理或不存在，请重新同步后查看。', 'NOT_FOUND')
  if (!AUTH_MODE_LABELS[mode]) fail('请选择有效的处理方式。', 'MODE')
  if (note.length < 2) fail('请填写处理说明或核对依据。', 'NOTE')
  if (note.length > 200) fail('处理说明不能超过 200 字。', 'NOTE')

  let userId = null
  if (mode === 'create') {
    if (userByName(state, username)) fail('该登录名已存在，请改为绑定已有账号。', 'DUP')
    const name = String(input.name || exception.name || '').trim()
    if (!name || name.length > 20) fail('请填写认证平台上的姓名（20 字以内）。', 'NAME')
    const dept = String(input.dept || exception.dept || '').trim().slice(0, 40)
    const user = createUser(state, actor, {
      username,
      name,
      role: 'STUDENT',
      studentNo: username,
      dept: dept || '未填写院系'
    }, now)
    userId = user.id
  } else if (mode === 'bind') {
    const target = userById(state, Number(input.userId))
    if (!target) fail('请选择要绑定的本地账号。', 'USER')
    if (target.role !== 'STUDENT') fail('只能绑定学生账号。', 'USER')
    const duplicate = state.users.find((user) => user.id !== target.id && String(user.studentNo || '') === username)
    if (duplicate) fail(`学号 ${username} 已绑定账号 ${duplicate.username}，请先处理重复账号。`, 'DUP')
    target.studentNo = username
    if (exception.name) target.name = exception.name
    if (exception.dept) target.dept = exception.dept
    userId = target.id
  }

  const resolved = state.authSync.resolved || {}
  resolved[username] = {
    at: toLocal(now, true),
    byId: actor?.id || null,
    byName: actor?.name || '系统管理员',
    mode,
    note,
    userId,
    identity: exception.name || ''
  }
  state.authSync.resolved = resolved
  state.authSync.handled = Object.keys(resolved).length
  state.authSync.exceptions = exceptions.filter((item) => item.username !== username)
  audit(state, actor, 'AUTH_EXCEPTION', `${username} ${AUTH_MODE_LABELS[mode]}：${note}`, now, String(userId || username))
  return { username, mode, userId }
}

/* ------------------------------- 演示时间 ------------------------------- */

export function setDemoTime(state, targetMs, nowReal) {
  if (!Number.isFinite(targetMs)) fail('请选择有效的演示时间。', 'TIME')
  const current = clockNow(state)
  if (targetMs < current) fail('演示时间只支持向前推进；如需回到初始时间，请重置演示数据。', 'TIME')
  state.clock = { base: targetMs, realAt: nowReal }
  audit(state, null, 'DEMO_TIME', `演示时间调整为 ${toLocal(targetMs)}`, targetMs)
  return targetMs
}

export function advanceDemoTime(state, minutes, nowReal) {
  if (!Number.isFinite(minutes) || minutes <= 0) fail('推进分钟数无效。', 'TIME')
  return setDemoTime(state, clockNow(state) + minutes * MINUTE, nowReal)
}

export function resetDemo(state, nowReal) {
  audit(state, null, 'RESET_DEMO', '重置浏览器本地演示数据', nowReal)
  return state
}

export function timeRangePresets(now) {
  const today = todayKey(now)
  return [
    { key: '7', label: '近 7 天', from: addDays(today, -6), to: today },
    { key: '14', label: '近 14 天', from: addDays(today, -13), to: today },
    { key: '30', label: '近 30 天', from: addDays(today, -29), to: today }
  ]
}

export function bookingDateOptions(state, now) {
  const today = todayKey(now)
  return Array.from({ length: state.config.advanceDays }, (_, i) => {
    const date = addDays(today, i)
    return { date, weekday: weekdayLabel(date), isToday: i === 0, isTomorrow: i === 1 }
  })
}
