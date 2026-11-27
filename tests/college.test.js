import test from 'node:test'
import assert from 'node:assert/strict'
import { seedState } from '../src/core/seed.js'
import {
  COLLEGES, UNASSIGNED_COLLEGE, buildClassRows, buildCollegeRows, buildStats,
  cancelBookingByAdmin, createBooking, registerUser, seatAvailability, updateUser, userByName
} from '../src/core/rules.js'
import { addDays } from '../src/core/time.js'

const NOW = Date.parse('2026-11-20T09:05:00+08:00')
const MINUTE = 60_000
const BOOK_DAY = addDays('2026-11-20', 4)

const fresh = () => seedState(NOW)
const actor = (state, username) => userByName(state, username)

function freeSlot(state, user, date = BOOK_DAY, start = '10:00', end = '11:00') {
  for (const room of state.rooms.filter((r) => r.enabled)) {
    const seat = seatAvailability(state, room.id, date, start, end, user.id).find((s) => s.state === 'FREE')
    if (seat) return { seatId: seat.id, date, start, end }
  }
  throw new Error('测试数据中没有空闲座位')
}

test('学生账号带学院与班级，教职工使用未分配学院', () => {
  const state = fresh()
  const students = state.users.filter((u) => u.role === 'STUDENT')
  assert.equal(students.length, 16)
  for (const student of students) {
    assert.ok(COLLEGES.includes(student.college), `${student.name} 学院应为有效学院`)
    assert.ok(student.className.length >= 4, `${student.name} 应有班级`)
  }
  assert.equal(actor(state, 'roomadmin').college, UNASSIGNED_COLLEGE)
  assert.equal(actor(state, 'roomadmin').className, '')
})

test('管理员代学生预定：记录操作人、代订标记与审计日志', () => {
  const state = fresh()
  const student = actor(state, 'student9')
  const admin = actor(state, 'roomadmin')
  const input = freeSlot(state, student)
  const booking = createBooking(state, student, input, NOW, admin)

  assert.equal(booking.userId, student.id)
  assert.equal(booking.proxy, true)
  assert.equal(booking.createdBy, admin.id)
  assert.equal(booking.createdByRole, 'ROOM_ADMIN')
  assert.equal(booking.operatorName, admin.name)
  assert.equal(booking.college, student.college)
  assert.equal(booking.className, student.className)
  assert.equal(booking.status, 'WAITING')
  assert.equal(state.logs.at(-1).action, 'PROXY_BOOK')
  assert.equal(state.logs.at(-1).actorId, admin.id)
  assert.match(state.logs.at(-1).detail, new RegExp(student.name))
})

test('学生自助预约不会被标记为代订', () => {
  const state = fresh()
  const student = actor(state, 'student9')
  const booking = createBooking(state, student, freeSlot(state, student), NOW)
  assert.equal(booking.proxy, false)
  assert.equal(booking.createdBy, student.id)
  assert.equal(state.logs.at(-1).action, 'BOOK')
})

test('黑名单学生不可被代订，提示与自助预约不同', () => {
  const state = fresh()
  const student = actor(state, 'student9')
  state.blacklist.push({
    id: state.next.blacklist++, userId: student.id, violationCount: 3,
    triggeredAt: '2026-11-19T10:00:00', status: 'ACTIVE', reason: '累计违约'
  })
  assert.throws(() => createBooking(state, student, freeSlot(state, student), NOW, actor(state, 'roomadmin')), /黑名单/)
  assert.throws(() => createBooking(state, student, freeSlot(state, student), NOW), /黑名单/)
})

test('管理员可取消学生预约，学生账号无权代取消', () => {
  const state = fresh()
  const student = actor(state, 'student9')
  const admin = actor(state, 'roomadmin')
  const booking = createBooking(state, student, freeSlot(state, student), NOW, admin)

  assert.throws(() => cancelBookingByAdmin(state, student, booking.id, NOW, '越权'), /仅管理员/)
  const cancelled = cancelBookingByAdmin(state, admin, booking.id, NOW + 5 * MINUTE, '学生临时有课，管理员代取消')
  assert.equal(cancelled.status, 'CANCELLED')
  assert.equal(cancelled.cancelledBy, admin.id)
  assert.match(cancelled.cancelReason, /管理员代取消/)
  assert.equal(state.logs.at(-1).action, 'CANCEL_ADMIN')
  assert.throws(() => cancelBookingByAdmin(state, admin, booking.id, NOW + 6 * MINUTE, '重复'), /无需取消/)
})

test('学院维度统计：汇总一致、筛选生效、班级可下钻', () => {
  const state = fresh()
  const stats = buildStats(state, { now: NOW, from: '2026-11-14', to: '2026-11-20' })
  assert.equal(stats.colleges.length, COLLEGES.length)
  assert.equal(stats.byCollege.reduce((sum, row) => sum + row.total, 0), stats.total)
  assert.equal(stats.byClass.reduce((sum, row) => sum + row.total, 0), stats.total)
  assert.ok(stats.byCollege.every((row) => row.students >= 0 && row.checkinRate >= 0 && row.checkinRate <= 1))

  const allSentinel = buildStats(state, { now: NOW, from: '2026-11-14', to: '2026-11-20', college: 'ALL' })
  assert.equal(allSentinel.total, stats.total)
  assert.deepEqual(allSentinel.byCollege.map((row) => row.college), stats.byCollege.map((row) => row.college))

  const target = stats.byCollege[0]
  const filtered = buildStats(state, { now: NOW, from: '2026-11-14', to: '2026-11-20', college: target.college })
  assert.equal(filtered.total, target.total)
  assert.equal(filtered.college, target.college)
  assert.equal(filtered.byCollege.length, 1)
  assert.equal(filtered.byCollege[0].college, target.college)
  assert.ok(filtered.byClass.every((row) => row.college === target.college))
})

test('学院与班级报表行可直接导出 CSV', () => {
  const state = fresh()
  const collegeRows = buildCollegeRows(state, { now: NOW, from: '2026-11-14', to: '2026-11-20' })
  const classRows = buildClassRows(state, { now: NOW, from: '2026-11-14', to: '2026-11-20' })
  assert.equal(collegeRows.length, COLLEGES.length)
  assert.ok(collegeRows.every((row) => Number.isFinite(row.checkinRate) && Number.isFinite(row.utilization)))
  assert.ok(classRows.length >= COLLEGES.length)
  assert.ok(classRows.every((row) => row.className && row.college))
})

test('注册与账号修改可维护学院、班级', () => {
  const state = fresh()
  const user = registerUser(state, {
    username: 'college_test', password: 'Study@2026', name: '测试同学',
    studentNo: '20269999', dept: '外国语学院', college: '外国语学院', className: '英语2601'
  }, NOW)
  assert.equal(user.college, '外国语学院')
  assert.equal(user.className, '英语2601')
  assert.equal(state.logs.at(-1).action, 'REGISTER')

  const admin = actor(state, 'sysadmin')
  updateUser(state, admin, user.id, { college: '人文学院', className: '汉语言2601' }, NOW)
  assert.equal(userById(state, user.id).college, '人文学院')
  assert.equal(userById(state, user.id).className, '汉语言2601')
})

function userById(state, id) {
  return state.users.find((u) => u.id === Number(id))
}
