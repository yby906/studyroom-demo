import { COLLEGES, DEFAULT_CONFIG, STATUS, maybeBlacklist } from './rules.js'
import {
  MINUTE, addDays, dateTimeAt, localDate, localTime, minutesToTime, parseLocal,
  timeToMinutes, toLocal
} from './time.js'

export const STORAGE_KEY = 'jingyuan.studyroom.v1'
export const DEMO_PASSWORD = 'Study@2026'

const CAMPUS = '主校区'
const DEPTS = COLLEGES

const USER_SEEDS = [
  { username: 'sysadmin', name: '周明远', role: 'SYS_ADMIN', dept: '信息化中心' },
  { username: 'roomadmin', name: '王岚', role: 'ROOM_ADMIN', dept: '图书馆自习室管理部' },
  { username: 'libadmin', name: '李承泽', role: 'LIB_ADMIN', dept: '图书馆办公室' },
  { username: 'student', name: '林一舟', role: 'STUDENT', studentNo: '20230101', dept: '计算机科学与技术学院', className: '计科2301' },
  { username: 'student2', name: '陈思远', role: 'STUDENT', studentNo: '20230102', dept: '软件工程学院', className: '软工2302' },
  { username: 'student3', name: '苏晚晴', role: 'STUDENT', studentNo: '20230103', dept: '外国语学院', className: '英语2301' },
  { username: 'student4', name: '赵子昂', role: 'STUDENT', studentNo: '20230104', dept: '数学与统计学院', className: '数统2302' },
  { username: 'student5', name: '沈书瑶', role: 'STUDENT', studentNo: '20230105', dept: '经济管理学院', className: '经管2301' },
  { username: 'student6', name: '何砚秋', role: 'STUDENT', studentNo: '20230106', dept: '机械与电气工程学院', className: '机电2302' },
  { username: 'student7', name: '周一诺', role: 'STUDENT', studentNo: '20230107', dept: '人文学院', className: '汉语言2301' },
  { username: 'student8', name: '顾星野', role: 'STUDENT', studentNo: '20230108', dept: '生命科学学院', className: '生科2302' },
  { username: 'student9', name: '江予安', role: 'STUDENT', studentNo: '20230109', dept: '计算机科学与技术学院', className: '计科2302' },
  { username: 'student10', name: '许知夏', role: 'STUDENT', studentNo: '20230110', dept: '外国语学院', className: '英语2302' },
  { username: 'student11', name: '陆时雨', role: 'STUDENT', studentNo: '20230111', dept: '软件工程学院', className: '软工2301' },
  { username: 'student12', name: '温以宁', role: 'STUDENT', studentNo: '20230112', dept: '数学与统计学院', className: '数统2301' },
  { username: 'student13', name: '程亦舟', role: 'STUDENT', studentNo: '20230113', dept: '机械与电气工程学院', className: '机电2301' },
  { username: 'student14', name: '白露', role: 'STUDENT', studentNo: '20230114', dept: '人文学院', className: '汉语言2302' },
  { username: 'student15', name: '唐知微', role: 'STUDENT', studentNo: '20230115', dept: '经济管理学院', className: '经管2302' },
  { username: 'student16', name: '韩叙', role: 'STUDENT', studentNo: '20230116', dept: '计算机科学与技术学院', className: '计科2301' }
]

const ROOM_SEEDS = [
  {
    name: '静思自习室', campus: CAMPUS, building: '图书馆', floor: 2,
    openTime: '08:00', closeTime: '22:00', rows: 4, columns: 8, prefix: 'A',
    description: '临窗自然光，安静阅读区，适合长时间专注与纸质阅读。'
  },
  {
    name: '知行自习室', campus: CAMPUS, building: '图书馆', floor: 3,
    openTime: '08:00', closeTime: '22:00', rows: 4, columns: 7, prefix: 'B',
    description: '插座充足、网络稳定，适合电脑学习、课程项目与小组讨论后的独立自习。'
  },
  {
    name: '明德自习室', campus: CAMPUS, building: '第一教学楼', floor: 3,
    openTime: '08:00', closeTime: '21:30', rows: 4, columns: 6, prefix: 'C',
    description: '教学楼内的日常自习空间，课间可达，适合碎片时间学习。'
  },
  {
    name: '格物研讨间', campus: CAMPUS, building: '图书馆', floor: 4,
    openTime: '09:00', closeTime: '21:00', rows: 4, columns: 3, prefix: 'D',
    description: '小型研讨与安静自习空间，因设备检修暂停开放。',
    enabled: false
  }
]

function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (rnd, list) => list[Math.floor(rnd() * list.length)]
const pad = (n) => String(n).padStart(2, '0')

function addSeatGrid(state, room, rows, columns, prefix) {
  for (let row = 1; row <= rows; row++) {
    for (let col = 1; col <= columns; col++) {
      const index = (row - 1) * columns + col
      const nearWindow = col === 1 || col === columns
      const hasPower = col % 2 === 0
      const type = row === 1 && col === 1 ? '无障碍' : nearWindow ? '靠窗' : hasPower ? '插座' : '标准'
      state.seats.push({
        id: state.next.seat++,
        roomId: room.id,
        code: `${prefix}${pad(index)}`,
        type,
        rowNo: row,
        colNo: col,
        enabled: true,
        note: ''
      })
    }
  }
}

export function seedState(nowReal = Date.now()) {
  const rnd = mulberry32(20261120)
  const today = localDate(nowReal)
  const base = Math.floor(nowReal / (5 * MINUTE)) * (5 * MINUTE)
  const now = base
  const state = {
    version: 1,
    clock: { base, realAt: nowReal },
    session: null,
    users: [],
    rooms: [],
    seats: [],
    bookings: [],
    violations: [],
    blacklist: [],
    logs: [],
    loginAttempts: {},
    authSync: { lastAt: null, created: 0, updated: 0, skipped: 0, handled: 0, exceptions: [], resolved: {}, operator: null },
    config: { ...DEFAULT_CONFIG },
    flags: { lastSweep: null },
    next: { user: 1, room: 1, seat: 1, booking: 1, violation: 1, blacklist: 1, log: 1 }
  }

  for (const seed of USER_SEEDS) {
    state.users.push({
      id: state.next.user++,
      username: seed.username,
      password: DEMO_PASSWORD,
      name: seed.name,
      role: seed.role,
      studentNo: seed.studentNo || '',
      dept: seed.dept,
      college: seed.role === 'STUDENT' ? seed.dept : '未分配学院',
      className: seed.className || '',
      enabled: true,
      lockedUntil: 0,
      failCount: 0,
      createdAt: toLocal(now - 120 * 24 * 60 * MINUTE, true)
    })
  }

  for (const seed of ROOM_SEEDS) {
    const room = {
      id: state.next.room++,
      name: seed.name,
      campus: seed.campus,
      building: seed.building,
      floor: seed.floor,
      openTime: seed.openTime,
      closeTime: seed.closeTime,
      description: seed.description,
      enabled: seed.enabled !== false,
      createdAt: toLocal(now - 180 * 24 * 60 * MINUTE, true),
      updatedAt: toLocal(now - 30 * 24 * 60 * MINUTE, true)
    }
    state.rooms.push(room)
    addSeatGrid(state, room, seed.rows, seed.columns, seed.prefix)
  }

  // 维修停用的示例座位
  const disabledSeat = state.seats.find((s) => s.code === 'B28')
  if (disabledSeat) {
    disabledSeat.enabled = false
    disabledSeat.note = '桌腿松动，维修中'
  }

  const students = state.users.filter((u) => u.role === 'STUDENT')
  const enabledRooms = state.rooms.filter((r) => r.enabled)
  const seatBusy = new Map()
  const userBusy = new Map()

  const roomById = (id) => state.rooms.find((r) => r.id === id)
  const seatById = (id) => state.seats.find((s) => s.id === id)

  const busyKey = (key) => key
  function freeIntervals(map, key, start, end) {
    const list = map.get(busyKey(key)) || []
    return !list.some(([s, e]) => start < e && end > s)
  }
  function reserve(map, key, start, end) {
    const list = map.get(busyKey(key)) || []
    list.push([start, end])
    map.set(busyKey(key), list)
  }

  function makeBooking(userId, seat, date, startMin, endMin, status, createdAt, extra = {}) {
    const start = minutesToTime(startMin)
    const end = minutesToTime(endMin)
    const seatKey = `${seat.id}|${date}`
    const userKey = `${userId}|${date}`
    if (!freeIntervals(seatBusy, seatKey, startMin, endMin)) return null
    if (!freeIntervals(userBusy, userKey, startMin, endMin)) return null
    if (status !== STATUS.CANCELLED) {
      reserve(seatBusy, seatKey, startMin, endMin)
      reserve(userBusy, userKey, startMin, endMin)
    }
    const startMs = dateTimeAt(date, start)
    const endMs = dateTimeAt(date, end)
    const id = state.next.booking++
    const booking = {
      id,
      code: `R${date.slice(2).replace(/-/g, '')}-${String(id).padStart(4, '0')}`,
      userId,
      seatId: seat.id,
      roomId: seat.roomId,
      date,
      start,
      end,
      status,
      createdAt,
      checkinDeadline: toLocal(startMs + state.config.checkinWindow * MINUTE, true),
      checkedInAt: extra.checkedInAt || null,
      endedAt: extra.endedAt || null,
      cancelReason: extra.cancelReason || null,
      note: extra.note || '',
      ...(extra.proxy
        ? { createdBy: extra.createdBy, createdByRole: extra.createdByRole, operatorName: extra.operatorName, proxy: true }
        : {})
    }
    state.bookings.push(booking)
    return booking
  }

  const roomOpen = (room) => timeToMinutes(room.openTime)
  const roomClose = (room) => timeToMinutes(room.closeTime)
  const seatsOf = (room) => state.seats.filter((s) => s.roomId === room.id && s.enabled)

  function randomCreatedAt(date, maxDaysBack = 3) {
    const back = Math.floor(rnd() * maxDaysBack) + 1
    const at = localDate(parseLocal(date + 'T12:00:00') - back * 24 * 60 * MINUTE)
    return `${at}T${pad(7 + Math.floor(rnd() * 14))}:${pad(Math.floor(rnd() * 6) * 10)}:00`
  }

  // 过去 29 天：形成可用于分析的历史预约
  for (let offset = -29; offset <= -1; offset++) {
    const date = addDays(today, offset)
    const weekday = new Date(date + 'T00:00:00Z').getUTCDay()
    const demand = weekday === 0 || weekday === 6 ? 0.55 : 1
    const seatTotal = enabledRooms.reduce((sum, room) => sum + seatsOf(room).length, 0)
    const target = Math.round(seatTotal * (1.45 + rnd() * 0.5) * demand)
    for (let i = 0; i < target * 2; i++) {
      const room = pick(rnd, enabledRooms)
      const seat = pick(rnd, seatsOf(room))
      const open = roomOpen(room)
      const close = roomClose(room)
      const duration = pick(rnd, [60, 90, 120, 120, 150, 180])
      const latest = close - duration
      if (latest <= open) continue
      const startMin = open + Math.floor(rnd() * ((latest - open) / 30 + 1)) * 30
      if (startMin + duration > close) continue
      const userId = pick(rnd, students).id
      if (!freeIntervals(userBusy, `${userId}|${date}`, startMin, startMin + duration)) continue
      const cancelled = rnd() < 0.12
      const status = cancelled ? STATUS.CANCELLED : STATUS.COMPLETED
      const createdAt = randomCreatedAt(date)
      const startMs = dateTimeAt(date, minutesToTime(startMin))
      const endMs = startMs + duration * MINUTE
      const checkedInAt = cancelled ? null : toLocal(startMs + Math.floor(rnd() * 10) * MINUTE, true)
      const endedAt = cancelled ? toLocal(startMs - 30 * MINUTE, true) : toLocal(endMs, true)
      makeBooking(userId, seat, date, startMin, startMin + duration, status, createdAt, {
        checkedInAt,
        endedAt,
        cancelReason: cancelled ? pick(rnd, ['临时有事，主动取消', '课程调整，无法到场', '身体不适，改日再来']) : null
      })
    }
  }

  // 把部分历史预约转换为失约，并控制每人次数，保证黑名单规则可演示
  const missedTargets = [
    [7, 4], [10, 3], [5, 2], [6, 2], [8, 2], [9, 2], [11, 2], [12, 2],
    [13, 2], [14, 2], [15, 2], [16, 1], [4, 1]
  ]
  for (const [userId, count] of missedTargets) {
    const candidates = state.bookings
      .filter((b) => b.userId === userId && b.date < today && b.status === STATUS.COMPLETED)
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    const picked = new Set()
    for (let k = 0; k < count && candidates.length; k++) {
      let index = Math.min(candidates.length - 1, Math.floor(((k + 0.5) / count) * candidates.length))
      while (picked.has(index) && index > 0) index--
      while (picked.has(index) && index < candidates.length - 1) index++
      if (picked.has(index)) continue
      picked.add(index)
      const booking = candidates[index]
      booking.status = STATUS.MISSED
      booking.checkedInAt = null
      booking.endedAt = booking.checkinDeadline
      const violation = {
        id: state.next.violation++,
        userId,
        bookingId: booking.id,
        type: 'NO_SHOW',
        points: 1,
        createdAt: booking.checkinDeadline,
        note: '超过签到截止时间仍未签到，座位自动释放'
      }
      state.violations.push(violation)
      if (state.violations.filter((v) => v.userId === userId).length >= state.config.violationThreshold) {
        maybeBlacklist(state, userId, parseLocal(booking.checkinDeadline))
      }
    }
  }

  // 黑名单学生不再保留进行中的预约
  state.bookings = state.bookings.filter((b) =>
    !state.blacklist.some((entry) => entry.userId === b.userId && entry.status === 'ACTIVE') ||
    !['WAITING', 'CHECKED_IN'].includes(b.status)
  )

  // 今天：按当前演示时刻生成不同状态的预约
  const todayActiveUsers = [4, 5, 7, 10]
  for (const room of enabledRooms) {
    const open = roomOpen(room)
    const close = roomClose(room)
    for (let i = 0; i < 9; i++) {
      const duration = pick(rnd, [60, 90, 120, 120, 180])
      const startMin = open + Math.floor(rnd() * ((close - duration - open) / 30 + 1)) * 30
      if (startMin + duration > close) continue
      const seat = pick(rnd, seatsOf(room))
      const user = pick(rnd, students.filter((s) => !todayActiveUsers.includes(s.id) && !state.blacklist.some((b) => b.userId === s.id && b.status === 'ACTIVE')))
      const startMs = dateTimeAt(today, minutesToTime(startMin))
      const endMs = startMs + duration * MINUTE
      let status = STATUS.WAITING
      if (rnd() < 0.08) status = STATUS.CANCELLED
      else if (endMs <= now) status = STATUS.COMPLETED
      else if (startMs <= now) status = STATUS.CHECKED_IN
      const checkedInAt = status === STATUS.COMPLETED || status === STATUS.CHECKED_IN
        ? toLocal(startMs + Math.floor(rnd() * 8) * MINUTE, true)
        : null
      const createdAt = toLocal(Math.max(now - (90 + Math.floor(rnd() * 240)) * MINUTE, parseLocal(today + 'T00:00:00')), true)
      makeBooking(user.id, seat, today, startMin, startMin + duration, status, createdAt, {
        checkedInAt,
        endedAt: status === STATUS.COMPLETED ? toLocal(endMs, true) : status === STATUS.CANCELLED ? toLocal(now - 30 * MINUTE, true) : null,
        cancelReason: status === STATUS.CANCELLED ? '临时调整，主动取消' : null
      })
    }
  }

  // 演示主账号：一条正在使用或即将开始的预约
  const demoStudent = state.users.find((u) => u.username === 'student')
  const room1 = state.rooms[0]
  const room2 = state.rooms[1]
  const open1 = roomOpen(room1)
  const close1 = roomClose(room1)
  let demoStart = Math.max(open1, Math.min(close1 - 120, Math.floor((timeToMinutes(localTime(now)) - 60) / 30) * 30))
  if (demoStart < open1) demoStart = open1
  if (demoStart + 120 > close1) demoStart = close1 - 120
  const freeSeat1 = seatsOf(room1).find((seat) =>
    freeIntervals(seatBusy, `${seat.id}|${today}`, demoStart, demoStart + 120)
  )
  if (freeSeat1 && demoStart >= open1) {
    const startMs = dateTimeAt(today, minutesToTime(demoStart))
    const endMs = startMs + 120 * MINUTE
    const stateOfDemo = now >= endMs ? STATUS.COMPLETED : now >= startMs ? STATUS.CHECKED_IN : STATUS.WAITING
    makeBooking(demoStudent.id, freeSeat1, today, demoStart, demoStart + 120, stateOfDemo,
      toLocal(Math.max(startMs - 120 * MINUTE, parseLocal(today + 'T00:00:00')), true), {
        checkedInAt: stateOfDemo === STATUS.WAITING ? null : toLocal(startMs + 3 * MINUTE, true),
        endedAt: stateOfDemo === STATUS.COMPLETED ? toLocal(endMs, true) : null
      })
  }

  // 今日一条已失约预约：展示系统自动处理的真实结果
  if (now >= dateTimeAt(today, '08:20')) {
    const missedUser = state.users.find((u) => u.username === 'student16')
    const missedSeat = seatsOf(room1).find((seat) =>
      freeIntervals(seatBusy, `${seat.id}|${today}`, 8 * 60, 9 * 60)
    )
    if (missedUser && missedSeat) {
      const missed = makeBooking(missedUser.id, missedSeat, today, 8 * 60, 9 * 60, STATUS.MISSED,
        toLocal(dateTimeAt(today, '07:20'), true), { endedAt: toLocal(dateTimeAt(today, '08:15'), true) })
      if (missed) {
        state.violations.push({
          id: state.next.violation++,
          userId: missedUser.id,
          bookingId: missed.id,
          type: 'NO_SHOW',
          points: 1,
          createdAt: toLocal(dateTimeAt(today, '08:15'), true),
          note: '超过签到截止时间仍未签到，座位自动释放'
        })
        maybeBlacklist(state, missedUser.id, dateTimeAt(today, '08:15'))
      }
    }
  }

  // 演示第二账号：一条待签到预约，可直接体验签到
  const demoStudent2 = state.users.find((u) => u.username === 'student2')
  const nowMinutes = timeToMinutes(localTime(now))
  let waitStart = Math.ceil((nowMinutes + 30) / 30) * 30
  let waitDate = today
  let waitRoom = room2
  if (waitStart < roomOpen(room2)) waitStart = roomOpen(room2)
  if (waitStart + 120 > roomClose(room2)) {
    waitDate = addDays(today, 1)
    waitStart = 10 * 60
    waitRoom = room1
  }
  const waitSeat = seatsOf(waitRoom).find((seat) =>
    freeIntervals(seatBusy, `${seat.id}|${waitDate}`, waitStart, waitStart + 120)
  ) || seatsOf(waitRoom)[0]
  if (waitSeat) {
    makeBooking(demoStudent2.id, waitSeat, waitDate, waitStart, waitStart + 120, STATUS.WAITING,
      toLocal(Math.max(now - 45 * MINUTE, parseLocal(waitDate + 'T00:00:00')), true))
  }

  // 明天及以后：待签到预约
  for (let offset = 1; offset < state.config.advanceDays; offset++) {
    const date = addDays(today, offset)
    for (const room of enabledRooms) {
      const open = roomOpen(room)
      const close = roomClose(room)
      for (let i = 0; i < 3; i++) {
        const duration = pick(rnd, [60, 90, 120, 150, 180])
        const startMin = open + Math.floor(rnd() * ((close - duration - open) / 30 + 1)) * 30
        if (startMin + duration > close) continue
        const seat = pick(rnd, seatsOf(room))
        const user = pick(rnd, students.filter((s) =>
          ![4, 5, 7, 10].includes(s.id) && !state.blacklist.some((b) => b.userId === s.id && b.status === 'ACTIVE')
        ))
        makeBooking(user.id, seat, date, startMin, startMin + duration, STATUS.WAITING,
          toLocal(now - (60 + Math.floor(rnd() * 600)) * MINUTE, true))
      }
    }
  }

  // 主账号明日的预约
  const tomorrow = addDays(today, 1)
  const tomorrowSeat = seatsOf(room1).find((seat) =>
    freeIntervals(seatBusy, `${seat.id}|${tomorrow}`, 14 * 60, 16 * 60)
  )
  if (tomorrowSeat) {
    makeBooking(demoStudent.id, tomorrowSeat, tomorrow, 14 * 60, 16 * 60, STATUS.WAITING,
      toLocal(now - 180 * MINUTE, true))
  }
  const demo3Seat = seatsOf(room3()).find((seat) =>
    freeIntervals(seatBusy, `${seat.id}|${tomorrow}`, 10 * 60, 12 * 60)
  )
  function room3() { return state.rooms[2] }

  const demoStudent3 = state.users.find((u) => u.username === 'student3')
  if (demo3Seat) {
    makeBooking(demoStudent3.id, demo3Seat, tomorrow, 10 * 60, 12 * 60, STATUS.WAITING,
      toLocal(now - 80 * MINUTE, true))
  }

  // 管理员代订演示：由自习室管理员或图书馆负责人替学生锁座
  function proxyBooking(actorUsername, studentUsername, roomIndex, offset, startMin, endMin, note, status = STATUS.WAITING) {
    const actor = state.users.find((u) => u.username === actorUsername)
    const student = state.users.find((u) => u.username === studentUsername)
    const room = state.rooms[roomIndex]
    if (!actor || !student || !room || !room.enabled) return
    const date = addDays(today, offset)
    if (startMin < roomOpen(room) || endMin > roomClose(room)) return
    const seat = seatsOf(room).find((s) => freeIntervals(seatBusy, `${s.id}|${date}`, startMin, endMin))
    if (!seat) return
    const startMs = dateTimeAt(date, minutesToTime(startMin))
    const endMs = dateTimeAt(date, minutesToTime(endMin))
    const done = status === STATUS.COMPLETED
    const createdAt = offset < 0
      ? toLocal(startMs - 120 * MINUTE, true)
      : toLocal(now - (60 + offset * 30) * MINUTE, true)
    makeBooking(student.id, seat, date, startMin, endMin, status, createdAt, {
      createdBy: actor.id,
      createdByRole: actor.role,
      operatorName: actor.name,
      proxy: true,
      note,
      checkedInAt: done ? toLocal(startMs + 4 * MINUTE, true) : null,
      endedAt: done ? toLocal(endMs, true) : null
    })
  }
  proxyBooking('roomadmin', 'student4', 0, 1, 9 * 60, 11 * 60, '数学建模竞赛集训')
  proxyBooking('roomadmin', 'student7', 1, 1, 15 * 60, 17 * 60, '毕业论文资料查阅')
  proxyBooking('libadmin', 'student10', 2, 2, 13 * 60, 15 * 60, '外语角活动准备')
  proxyBooking('roomadmin', 'student12', 0, -2, 8 * 60, 9 * 60, '学科竞赛集训，管理员代为锁座', STATUS.COMPLETED)
  proxyBooking('libadmin', 'student14', 1, -3, 8 * 60, 9 * 60, '学生外出实习，委托管理员预约', STATUS.COMPLETED)

  // 操作日志：最近几天的关键动作
  const rawLogs = []
  const userById = (id) => state.users.find((u) => u.id === id)
  const roomName = (id) => state.rooms.find((r) => r.id === id)?.name || '自习室'
  const seatCode = (id) => state.seats.find((s) => s.id === id)?.code || ''
  const cutoff = toLocal(now - 5 * 24 * 60 * MINUTE, true)
  for (const booking of state.bookings) {
    if (booking.createdAt < cutoff) continue
    const student = userById(booking.userId)
    const proxy = Boolean(booking.proxy)
    const operator = proxy ? userById(booking.createdBy) : null
    rawLogs.push({
      actorId: proxy ? operator?.id : student?.id,
      actorName: proxy ? operator?.name : student?.name,
      actorRole: proxy ? operator?.role : 'STUDENT',
      action: proxy ? 'PROXY_BOOK' : 'BOOK', target: booking.code,
      detail: proxy
        ? `代 ${student?.name || '学生'}（${student?.studentNo || ''}）预约 ${roomName(booking.roomId)} ${seatCode(booking.seatId)} · ${booking.date} ${booking.start}–${booking.end}`
        : `${roomName(booking.roomId)} ${seatCode(booking.seatId)} · ${booking.date} ${booking.start}–${booking.end}`,
      createdAt: booking.createdAt, result: '成功'
    })
    if (booking.checkedInAt) {
      rawLogs.push({
        actorId: student?.id, actorName: student?.name, actorRole: 'STUDENT',
        action: 'CHECK_IN', target: booking.code,
        detail: `${roomName(booking.roomId)} ${seatCode(booking.seatId)} 入座`,
        createdAt: booking.checkedInAt, result: '成功'
      })
    }
    if (booking.status === STATUS.CANCELLED) {
      rawLogs.push({
        actorId: student?.id, actorName: student?.name, actorRole: 'STUDENT',
        action: 'CANCEL', target: booking.code,
        detail: `${roomName(booking.roomId)} ${seatCode(booking.seatId)} · ${booking.cancelReason || '主动取消'}`,
        createdAt: booking.endedAt || booking.createdAt, result: '成功'
      })
    }
    if (booking.status === STATUS.MISSED) {
      rawLogs.push({
        actorId: null, actorName: '系统任务', actorRole: 'SYSTEM',
        action: 'MISSED', target: booking.code,
        detail: `${roomName(booking.roomId)} ${seatCode(booking.seatId)} 超时未签到，座位已释放并入违约记录`,
        createdAt: booking.endedAt || booking.checkinDeadline, result: '成功'
      })
    }
  }
  for (const entry of state.blacklist) {
    const student = userById(entry.userId)
    rawLogs.push({
      actorId: null, actorName: '系统任务', actorRole: 'SYSTEM',
      action: 'BLACKLIST', target: String(entry.userId),
      detail: `${student?.name || '学生'} 累计违约 ${entry.violationCount} 次，自动加入黑名单`,
      createdAt: entry.triggeredAt, result: '成功'
    })
  }
  rawLogs.push({
    actorId: 2, actorName: '王岚', actorRole: 'ROOM_ADMIN',
    action: 'SEAT_STATUS', target: String(disabledSeat?.id || ''),
    detail: `维修停用知行自习室 ${disabledSeat?.code || 'B28'}`,
    createdAt: toLocal(now - 20 * 60 * MINUTE, true), result: '成功'
  })
  rawLogs.push({
    actorId: 1, actorName: '周明远', actorRole: 'SYS_ADMIN',
    action: 'CONFIG_UPDATE', target: '',
    detail: '将违约阈值调整为 3 次；签到窗口保持 15 分钟',
    createdAt: toLocal(now - 26 * 60 * MINUTE, true), result: '成功'
  })
  rawLogs.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  state.logs = rawLogs.slice(-320).map((entry, index) => ({
    id: index + 1,
    actorId: entry.actorId ?? null,
    actorName: entry.actorName || '系统任务',
    actorRole: entry.actorRole || 'SYSTEM',
    action: entry.action,
    target: entry.target || '',
    detail: entry.detail || '',
    result: entry.result || '成功',
    ip: '127.0.0.1',
    createdAt: entry.createdAt
  }))
  state.next.log = state.logs.length + 1

  return state
}

export function isValidState(state) {
  if (!state || state.version !== 1) return false
  if (!Number.isFinite(state.clock?.base) || !Number.isFinite(state.clock?.realAt)) return false
  for (const key of ['users', 'rooms', 'seats', 'bookings', 'violations', 'blacklist', 'logs']) {
    if (!Array.isArray(state[key])) return false
  }
  if (!state.config || typeof state.config !== 'object') return false
  if (!state.next || !Number.isInteger(state.next.booking) || !Number.isInteger(state.next.user)) return false
  if (!state.users.every((u) => Number.isInteger(u.id) && typeof u.username === 'string' && u.role)) return false
  if (!state.rooms.every((r) => Number.isInteger(r.id) && typeof r.name === 'string')) return false
  if (!state.seats.every((s) => Number.isInteger(s.id) && state.rooms.some((r) => r.id === s.roomId))) return false
  return true
}
