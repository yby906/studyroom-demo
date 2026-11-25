import test from 'node:test'
import assert from 'node:assert/strict'
import { seedState } from '../src/core/seed.js'
import { backupJson, parseBackup } from '../src/core/backup.js'
import { addMonths, monthGrid, monthKeyOf, monthLabelOf } from '../src/core/time.js'
import {
  RuleError, activeBlacklist, availableSeatCount, buildReportRows, buildStats, cancelBooking,
  checkIn, checkOut, createBooking, createUser, csvText, deleteRoom, deleteSeat, login, logout,
  registerUser, resolveAuthException, saveConfig, saveRoom, saveSeat, seatAvailability, sessionUser, setSeatEnabled,
  simulateAuthSync, sweep, toggleRoom, unblacklist, unlockUser, updateUser, userByName, violationSummary
} from '../src/core/rules.js'

const NOW = Date.parse('2026-11-20T09:05:00+08:00')
const TODAY = '2026-11-20'
const TOMORROW = '2026-11-21'
const MINUTE = 60_000
const at = (date, time) => Date.parse(`${date}T${time}:00+08:00`)

function fresh() {
  return seedState(NOW)
}
function actor(state, username) {
  return userByName(state, username)
}
function book(state, user, date, start, end, seatId = null) {
  const seat = seatId || seatAvailability(state, 1, date, start, end, user.id).find((s) => s.state === 'FREE')?.id
  if (!seat) throw new Error('测试数据中没有空闲座位')
  return createBooking(state, user, { seatId: seat, date, start, end }, NOW)
}

test('登录成功、失败与连续失败锁定', () => {
  const state = fresh()
  const student = login(state, 'student', 'Study@2026', NOW)
  assert.equal(student.name, '林一舟')
  assert.equal(state.session.username, 'student')
  assert.equal(sessionUser(state, NOW + 5 * MINUTE).id, student.id)
  logout(state, student, NOW + 10 * MINUTE)
  assert.equal(sessionUser(state, NOW + 11 * MINUTE), null)

  const clean = fresh()
  for (let i = 0; i < 4; i++) {
    assert.throws(() => login(clean, 'student', 'wrong', NOW + i * MINUTE), /账号或密码错误/)
  }
  assert.throws(() => login(clean, 'student', 'wrong', NOW + 4 * MINUTE), /已锁定/)
  assert.throws(() => login(clean, 'student', 'Study@2026', NOW + 5 * MINUTE), /已锁定/)
  const admin = actor(clean, 'sysadmin')
  unlockUser(clean, admin, actor(clean, 'student').id, NOW + 6 * MINUTE)
  assert.ok(login(clean, 'student', 'Study@2026', NOW + 7 * MINUTE))
})

test('会话超时后需要重新登录', () => {
  const state = fresh()
  login(state, 'student', 'Study@2026', NOW)
  assert.equal(sessionUser(state, NOW + 29 * MINUTE).username, 'student')
  assert.equal(sessionUser(state, NOW + 31 * MINUTE), null)
  assert.equal(state.session, null)
})

test('预约成功、时段冲突与同一座位占用校验', () => {
  const state = fresh()
  const student = actor(state, 'student')
  const booking = book(state, student, TOMORROW, '18:00', '20:00')
  assert.equal(booking.status, 'WAITING')
  assert.equal(booking.duration, 120)
  assert.equal(booking.checkinDeadline.slice(0, 16), '2026-11-21 18:15')

  assert.throws(
    () => createBooking(state, actor(state, 'student2'), { seatId: booking.seatId, date: TOMORROW, start: '19:00', end: '21:00' }, NOW),
    /该座位刚被占用/
  )
  assert.throws(
    () => book(state, student, TOMORROW, '19:00', '21:00'),
    /您在该时段已有未完成预约/
  )
  // 首尾相接不算冲突
  const adjacent = createBooking(state, actor(state, 'student2'), {
    seatId: booking.seatId, date: TOMORROW, start: '20:00', end: '21:30'
  }, NOW)
  assert.equal(adjacent.status, 'WAITING')
  assert.ok(availableSeatCount(state, 1, TOMORROW, '18:00', '20:00', student.id) < 32)
})

test('预约时间、开放时间与可提前天数校验', () => {
  const state = fresh()
  const student = actor(state, 'student')
  assert.throws(() => book(state, student, '2026-11-01', '10:00', '11:00'), /过去的日期/)
  assert.throws(() => book(state, student, '2026-11-30', '10:00', '11:00'), /最多可提前预约/)
  assert.throws(() => book(state, student, TOMORROW, '07:00', '08:00'), /开放时间/)
  assert.throws(() => book(state, student, TOMORROW, '23:00', '23:30'), /开放时间/)
  assert.throws(() => book(state, student, TOMORROW, '10:00', '10:15'), /不得短于/)
  assert.throws(() => book(state, student, TOMORROW, '10:00', '15:00'), /不得超过/)
  assert.throws(() => book(state, student, TOMORROW, '10:00', '10:00'), /必须晚于/)
})

test('黑名单学生不能预约，解除后恢复', () => {
  const state = fresh()
  const blocked = actor(state, 'student4')
  assert.ok(activeBlacklist(state, blocked.id))
  assert.throws(() => book(state, blocked, TOMORROW, '14:00', '16:00'), /黑名单/)
  const admin = actor(state, 'roomadmin')
  unblacklist(state, admin, blocked.id, '经核实情况说明，同意解除', NOW)
  assert.equal(activeBlacklist(state, blocked.id), null)
  assert.ok(book(state, blocked, TOMORROW, '18:00', '19:00'))
})

test('取消预约：签到前可取消，进入签到时段后不可取消', () => {
  const state = fresh()
  const student = actor(state, 'student')
  const booking = book(state, student, TOMORROW, '10:00', '11:00')
  const cancelled = cancelBooking(state, student, booking.id, NOW, '临时有事')
  assert.equal(cancelled.status, 'CANCELLED')
  assert.equal(seatAvailability(state, 1, TOMORROW, '10:00', '11:00', student.id).find((s) => s.id === booking.seatId).state, 'FREE')

  const current = book(state, student, TODAY, '10:00', '12:00')
  assert.throws(() => cancelBooking(state, student, current.id, at(TODAY, '10:05'), '已开始'), /预约已开始/)
})

test('签到、签退与重复操作', () => {
  const state = fresh()
  const student = actor(state, 'student2')
  const booking = book(state, student, TOMORROW, '14:00', '16:00')
  assert.throws(() => checkIn(state, student, booking.id, NOW), /尚未到签到时间/)
  const checked = checkIn(state, student, booking.id, at(TOMORROW, '14:05'))
  assert.equal(checked.status, 'CHECKED_IN')
  assert.equal(checked.checkedInAt.slice(0, 16), '2026-11-21 14:05')
  assert.throws(() => checkIn(state, student, booking.id, at(TOMORROW, '14:06')), /不可签到/)

  const completed = checkOut(state, student, booking.id, at(TOMORROW, '15:20'))
  assert.equal(completed.status, 'COMPLETED')
  assert.throws(() => checkOut(state, student, booking.id, at(TOMORROW, '15:30')), /已完成/)
})

test('超时未签到自动失约、释放座位且幂等', () => {
  const state = fresh()
  const student = actor(state, 'student')
  const booking = book(state, student, TOMORROW, '09:00', '10:00')
  const deadline = at(TOMORROW, '09:15')
  const first = sweep(state, deadline + MINUTE)
  assert.ok(first.missed >= 1)
  assert.equal(state.bookings.find((b) => b.id === booking.id).status, 'MISSED')
  assert.equal(state.violations.filter((v) => v.bookingId === booking.id).length, 1)
  const second = sweep(state, deadline + 2 * MINUTE)
  assert.equal(second.missed, 0)
  assert.equal(state.violations.filter((v) => v.bookingId === booking.id).length, 1)
  assert.equal(seatAvailability(state, 1, TOMORROW, '09:00', '10:00', student.id).find((s) => s.id === booking.seatId).state, 'FREE')
})

test('使用中预约在时段结束后自动完成', () => {
  const state = fresh()
  const student = actor(state, 'student2')
  const booking = book(state, student, TOMORROW, '14:00', '15:00')
  checkIn(state, student, booking.id, at(TOMORROW, '14:02'))
  const result = sweep(state, at(TOMORROW, '15:01'))
  assert.ok(result.completed >= 1)
  const updated = state.bookings.find((b) => b.id === booking.id)
  assert.equal(updated.status, 'COMPLETED')
  assert.equal(updated.endedAt.slice(0, 16), '2026-11-21 15:00')
})

test('达到违约阈值自动加入黑名单，管理员解除后可恢复', () => {
  const state = fresh()
  state.config.violationThreshold = 2
  const student = actor(state, 'student')
  const booking = book(state, student, TOMORROW, '09:00', '10:00')
  const result = sweep(state, at(TOMORROW, '09:30'))
  assert.ok(result.blacklisted >= 1)
  assert.ok(activeBlacklist(state, student.id))
  assert.throws(() => book(state, student, TODAY, '16:00', '17:00'), /黑名单/)

  unblacklist(state, actor(state, 'roomadmin'), student.id, '已核实并完成教育，同意解除', at(TOMORROW, '10:00'))
  assert.equal(activeBlacklist(state, student.id), null)
  assert.ok(book(state, student, TOMORROW, '18:00', '19:00'))
})

test('自助注册：创建学生账号、校验重复登录名与弱密码', () => {
  const state = fresh()
  const user = registerUser(state, {
    name: '新同学', username: 'newstudent', password: 'abc12345',
    studentNo: '20261234', dept: '测试学院'
  }, NOW)
  assert.equal(user.role, 'STUDENT')
  assert.equal(user.enabled, true)
  assert.equal(userByName(state, 'newstudent').name, '新同学')
  assert.ok(login(state, 'newstudent', 'abc12345', NOW))
  assert.equal(sessionUser(state, NOW + MINUTE).username, 'newstudent')

  assert.throws(() => registerUser(state, {
    name: '重复账号', username: 'newstudent', password: 'abc12345'
  }, NOW), /登录名已被使用/)
  assert.throws(() => registerUser(state, {
    name: '弱密码', username: 'weakuser', password: '123'
  }, NOW), /密码须为/)
  assert.throws(() => registerUser(state, {
    name: '非法账号', username: 'bad name', password: 'abc12345'
  }, NOW), /登录名须为/)
})

test('房间新增、改名、启停与删除约束', () => {
  const state = fresh()
  const admin = actor(state, 'roomadmin')
  const room = saveRoom(state, admin, {
    name: '测试自习室', campus: '主校区', building: '测试楼', floor: 5,
    openTime: '08:00', closeTime: '22:00', rows: 2, columns: 3, prefix: 'T', description: '测试'
  }, NOW)
  assert.equal(room.enabled, true)
  assert.equal(state.seats.filter((s) => s.roomId === room.id).length, 6)
  assert.throws(() => saveRoom(state, admin, {
    name: '测试自习室', campus: '主校区', building: '测试楼', floor: 5, openTime: '08:00', closeTime: '22:00'
  }, NOW), /名称已存在/)
  toggleRoom(state, admin, room.id, false, NOW)
  assert.equal(room.enabled, false)
  deleteRoom(state, admin, room.id, NOW)
  assert.equal(state.rooms.some((r) => r.id === room.id), false)
  assert.throws(() => deleteRoom(state, admin, 1, NOW), /存在预约记录/)
})

test('座位编号唯一、维修停用与删除约束', () => {
  const state = fresh()
  const admin = actor(state, 'roomadmin')
  const seat = saveSeat(state, admin, { roomId: 1, code: 'T99', type: '插座' }, NOW)
  assert.equal(seat.enabled, true)
  assert.throws(() => saveSeat(state, admin, { roomId: 1, code: 'T99', type: '标准' }, NOW), /编号已存在/)
  setSeatEnabled(state, admin, seat.id, false, NOW)
  assert.equal(seat.enabled, false)
  deleteSeat(state, admin, seat.id, NOW)
  assert.equal(state.seats.some((s) => s.id === seat.id), false)
  const bookedSeat = state.bookings[0].seatId
  assert.throws(() => deleteSeat(state, admin, bookedSeat, NOW), /存在预约记录/)
})

test('配置校验：范围、参数冲突与保存', () => {
  const state = fresh()
  const admin = actor(state, 'sysadmin')
  assert.throws(() => saveConfig(state, admin, { checkinWindow: 15, minDuration: 30, ...state.config, maxDuration: 10 }, NOW), /须在/)
  assert.throws(() => saveConfig(state, admin, { ...state.config, checkinWindow: 30 }, NOW), /签到窗口必须小于/)
  assert.throws(() => saveConfig(state, admin, { ...state.config, openTime: '23:00', closeTime: '08:00' }, NOW), /闭馆时间/)
  const result = saveConfig(state, admin, { ...state.config, checkinWindow: 10, violationThreshold: 4 }, NOW)
  assert.equal(result.config.checkinWindow, 10)
  assert.equal(result.changes.length, 2)
})

test('账号创建、角色变更与最高权限保护', () => {
  const state = fresh()
  const admin = actor(state, 'sysadmin')
  const user = createUser(state, admin, {
    username: 'test2026', name: '测试同学', role: 'STUDENT', studentNo: '20269999', dept: '测试学院'
  }, NOW)
  assert.equal(userByName(state, 'test2026').role, 'STUDENT')
  assert.throws(() => createUser(state, admin, { username: 'test2026', name: '重复', role: 'STUDENT' }, NOW), /账号已存在/)
  updateUser(state, admin, user.id, { role: 'ROOM_ADMIN' }, NOW)
  assert.equal(userByName(state, 'test2026').role, 'ROOM_ADMIN')
  const root = userByName(state, 'sysadmin')
  assert.throws(() => updateUser(state, admin, root.id, { role: 'STUDENT' }, NOW), /最高权限/)
  assert.throws(() => updateUser(state, admin, root.id, { enabled: false }, NOW), /最高权限/)
})

test('统一身份认证模拟同步：新增、跳过与异常清单', () => {
  const state = fresh()
  const admin = actor(state, 'sysadmin')
  const first = simulateAuthSync(state, admin, NOW)
  assert.equal(first.created, 2)
  assert.equal(first.exceptions.length, 1)
  assert.ok(userByName(state, '20260201'))
  const second = simulateAuthSync(state, admin, NOW + MINUTE)
  assert.equal(second.created, 0)
  assert.equal(second.skipped, 2)
})

test('认证异常可创建账号处理，处理结果持久化且再次同步不重复上报', () => {
  const state = fresh()
  const admin = actor(state, 'sysadmin')
  simulateAuthSync(state, admin, NOW)
  const exception = state.authSync.exceptions[0]
  assert.equal(exception.username, '20250118')
  const result = resolveAuthException(state, admin, {
    username: '20250118',
    mode: 'create',
    name: '林建安',
    dept: '数学学院',
    note: '已核对认证平台与学籍信息，确认为同一名学生，同意创建账号'
  }, NOW)
  assert.equal(result.mode, 'create')
  assert.ok(result.userId)
  assert.equal(userByName(state, '20250118').name, '林建安')
  assert.equal(userByName(state, '20250118').studentNo, '20250118')
  assert.equal(state.authSync.exceptions.length, 0)
  assert.equal(state.authSync.resolved['20250118'].mode, 'create')
  assert.equal(state.authSync.resolved['20250118'].byName, admin.name)

  const again = simulateAuthSync(state, admin, NOW + MINUTE)
  assert.equal(again.exceptions.length, 0)
  assert.equal(again.handled, 1)
  assert.equal(again.created, 0)
  assert.ok(state.authSync.resolved['20250118'])
})

test('认证异常可绑定已有账号或仅标记处理', () => {
  const state = fresh()
  const admin = actor(state, 'sysadmin')
  simulateAuthSync(state, admin, NOW)
  const target = userByName(state, 'student')
  resolveAuthException(state, admin, {
    username: '20250118',
    mode: 'bind',
    userId: String(target.id),
    note: '已核对姓名与院系，确认绑定到该学生账号'
  }, NOW)
  assert.equal(target.studentNo, '20250118')
  assert.equal(target.name, '林建安')
  assert.equal(state.authSync.exceptions.length, 0)

  const second = fresh()
  const admin2 = actor(second, 'sysadmin')
  simulateAuthSync(second, admin2, NOW)
  resolveAuthException(second, admin2, {
    username: '20250118',
    mode: 'ignore',
    note: '该学号对应学生已离校，暂不建号，保留异常处理记录'
  }, NOW)
  assert.equal(second.users.some((u) => u.username === '20250118'), false)
  assert.equal(second.authSync.resolved['20250118'].mode, 'ignore')
  assert.equal(second.authSync.exceptions.length, 0)
})


test('统计口径、报表行与 CSV 导出', () => {
  const state = fresh()
  const stats = buildStats(state, { from: '2026-11-14', to: TODAY, now: NOW })
  assert.ok(stats.total > 100)
  assert.ok(stats.checkinRate > 0.9 && stats.checkinRate <= 1)
  assert.ok(stats.utilization > 0 && stats.utilization <= 1)
  assert.equal(stats.byDay.length, 7)
  assert.equal(stats.byRoom.length, 4)
  assert.ok(stats.weekHeat.length === 7 && stats.weekHeat[0].length === 4)

  const rows = buildReportRows(state, { from: '2026-11-14', to: TODAY, now: NOW })
  assert.ok(rows.length > 0)
  assert.ok(rows.every((row) => row.total > 0))

  const csv = csvText(['日期', '备注'], [['2026-11-20', '含逗号,与"引号"']])
  assert.ok(csv.startsWith('\ufeff'))
  assert.ok(csv.includes('"含逗号,与""引号"""'))
})

test('个人违约汇总与座位可用数量', () => {
  const state = fresh()
  const summary = violationSummary(state, actor(state, 'student4').id)
  assert.equal(summary.count, state.violations.filter((v) => v.userId === 7).length)
  assert.ok(summary.active)
  const available = availableSeatCount(state, 1, TOMORROW, '14:00', '16:00', 4)
  assert.ok(available >= 0 && available <= 32)
})

test('完整数据备份可以导出并重新解析，非法文件会被拒绝', () => {
  const state = fresh()
  login(state, 'student', 'Study@2026', NOW)
  const text = backupJson(state, NOW)
  assert.ok(text.includes('jingyuan-studyroom'))
  const parsed = parseBackup(text)
  assert.equal(parsed.state.users.length, state.users.length)
  assert.equal(parsed.state.bookings.length, state.bookings.length)
  assert.equal(parsed.state.rooms.length, state.rooms.length)
  assert.equal(parsed.state.session, null)
  assert.equal(parsed.summary.bookings, state.bookings.length)
  assert.throws(() => parseBackup('{not json'), /有效的 JSON/)
  assert.throws(() => parseBackup(JSON.stringify({ app: 'jingyuan-studyroom', version: 99, data: state })), /版本不兼容/)
  assert.throws(() => parseBackup(JSON.stringify({ hello: 'world' })), /内容不完整/)
})

test('月历网格与月份工具', () => {
  assert.equal(monthKeyOf(NOW), '2026-11')
  assert.equal(addMonths('2026-11', 1), '2026-12')
  assert.equal(addMonths('2026-01', -1), '2025-12')
  assert.equal(monthLabelOf('2026-11'), '2026 年 11 月')
  const grid = monthGrid('2026-11')
  assert.equal(grid.length, 42)
  assert.equal(grid[0].date, '2026-10-26')
  assert.equal(grid[0].inMonth, false)
  assert.equal(grid.filter((cell) => cell.inMonth).length, 30)
  assert.ok(grid.some((cell) => cell.date === '2026-11-20' && cell.inMonth))
})
