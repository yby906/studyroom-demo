import test from 'node:test'
import assert from 'node:assert/strict'
import { seedState } from '../src/core/seed.js'
import { clockNow } from '../src/core/rules.js'
import { addDays, localDate } from '../src/core/time.js'
import { renderStudentSeats, renderStudentMine, renderStudentCalendar, renderStudentViolations, renderStudentGuide } from '../src/ui/student.js'
import { renderAdminDashboard, renderAdminRooms, renderAdminSeats, renderAdminReservations, renderAdminViolations, renderAdminReports } from '../src/ui/roomAdmin.js'
import { renderAnalytics } from '../src/ui/analytics.js'
import { renderProxy } from '../src/ui/proxy.js'
import { renderSysDashboard, renderSysAccounts, renderSysLogs, renderSysAuth, renderSysConfig } from '../src/ui/sysAdmin.js'

const NOW = Date.parse('2026-11-20T09:20:00+08:00')
const state = seedState(NOW)
const now = clockNow(state)
const today = localDate(now)
const student = state.users.find((u) => u.username === 'student')
const roomAdmin = state.users.find((u) => u.username === 'roomadmin')
const sysAdmin = state.users.find((u) => u.username === 'sysadmin')
const firstRoom = state.rooms[0]

function ui() {
  return {
    date: today, roomId: firstRoom.id, start: '', end: '', seatId: null,
    mineStatus: 'ALL', mineKeyword: '', calendarMonth: '', calendarDate: '', violationKeyword: '',
    adminSeatRoomId: firstRoom.id, adminDate: today, adminRoomId: 0, adminStatus: 'ALL', adminKeyword: '',
    reportFrom: addDays(today, -6), reportTo: today, reportRoomId: 0,
    accountRole: 'ALL', accountKeyword: '', logAction: 'ALL', logResult: 'ALL', logKeyword: '', logPage: 1,
    analyticsDays: 7, analyticsRoomId: 0, analyticsCollege: 'ALL',
    proxyDate: today, proxyCollege: 'ALL', proxyKeyword: '', proxyStudentId: 0,
    proxyRoomId: firstRoom.id, proxyStart: '', proxyEnd: '', proxySeatId: null
  }
}

function ctxFor(user, view) {
  return { state, user, now, view, ui: ui(), modal: null }
}

function clean(html, label) {
  assert.ok(typeof html === 'string' && html.length > 100, label + ' 应生成页面片段')
  assert.ok(!html.includes('undefined'), label + ' 不应包含 undefined')
  assert.ok(!html.includes('NaN'), label + ' 不应包含 NaN')
}

test('学生端页面渲染：学院班级、代订来源与个人资料条', () => {
  const seats = renderStudentSeats(ctxFor(student, 'seats'))
  clean(seats, '学生选座')
  assert.match(seats, /预约人/)
  const mine = renderStudentMine(ctxFor(student, 'mine'))
  clean(mine, '我的预约')
  assert.match(mine, /profile-strip/)
  assert.match(mine, /学院/)
  const calendar = renderStudentCalendar(ctxFor(student, 'calendar'))
  clean(calendar, '月历')
  const violations = renderStudentViolations(ctxFor(student, 'violations'))
  clean(violations, '违约')
  const guide = renderStudentGuide(ctxFor(student, 'guide'))
  clean(guide, '指南')
})

test('管理员页面渲染：代订入口、学院列与学院统计', () => {
  const dashboard = renderAdminDashboard(ctxFor(roomAdmin, 'dashboard'))
  clean(dashboard, '管理员首页')
  assert.match(dashboard, /代订座位/)
  const rooms = renderAdminRooms(ctxFor(roomAdmin, 'rooms'))
  clean(rooms, '自习室管理')
  const seats = renderAdminSeats(ctxFor(roomAdmin, 'seats'))
  clean(seats, '座位管理')
  const reservations = renderAdminReservations(ctxFor(roomAdmin, 'reservations'))
  clean(reservations, '预约记录')
  assert.match(reservations, /学院 \/ 班级/)
  assert.match(reservations, /来源/)
  assert.match(reservations, /可代订、可取消/)
  const violations = renderAdminViolations(ctxFor(roomAdmin, 'violations'))
  clean(violations, '违约处理')
  const reports = renderAdminReports(ctxFor(roomAdmin, 'reports'))
  clean(reports, '统计报表')
  assert.match(reports, /按学院统计/)
  assert.match(reports, /export-college/)
})

test('代订视图渲染：学生卡片、座位图与最近代订', () => {
  const html = renderProxy(ctxFor(roomAdmin, 'proxy'))
  clean(html, '代订视图')
  assert.match(html, /proxy-student-card/)
  assert.match(html, /proxy-seat-map/)
  assert.match(html, /代订信息/)
  assert.match(html, /最近代订/)
})

test('学院数据图渲染：筛选、环形图、排行与明细', () => {
  const html = renderAnalytics(ctxFor(sysAdmin, 'analytics'))
  clean(html, '学院看板')
  assert.match(html, /analyticsCollege/)
  assert.match(html, /学院预约分布/)
  assert.match(html, /donut-legend/)
  assert.match(html, /学院统计明细/)
  assert.match(html, /set-analytics-college/)
})

test('系统管理页面渲染：账号表显示学院班级', () => {
  const accounts = renderSysAccounts(ctxFor(sysAdmin, 'accounts'))
  clean(accounts, '账号管理')
  assert.match(accounts, /姓名 \/ 学院/)
  const dashboard = renderSysDashboard(ctxFor(sysAdmin, 'dashboard'))
  clean(dashboard, '系统首页')
  const logs = renderSysLogs(ctxFor(sysAdmin, 'logs'))
  clean(logs, '日志')
  const auth = renderSysAuth(ctxFor(sysAdmin, 'auth'))
  clean(auth, '统一认证')
  const config = renderSysConfig(ctxFor(sysAdmin, 'config'))
  clean(config, '参数配置')
})
