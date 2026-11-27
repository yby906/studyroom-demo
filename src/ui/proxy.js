import {
  ACTIVE_STATUS, COLLEGES, activeBlacklist, bookingDateOptions, collegeOf, collegeShort,
  endTimeOptions, maskStudentNo, seatAvailability, startTimeOptions, violationSummary
} from '../core/rules.js'
import { fmtDuration, fmtRange, humanDate, localDate, timeToMinutes, weekdayLabel } from '../core/time.js'
import { avatar, chip, emptyState, esc, icon, pct, sectionTitle, statCard, statusBadge } from './components.js'

function ensureProxyFilters(ctx) {
  const { state, now, ui } = ctx
  const today = localDate(now)
  const rooms = state.rooms.filter((r) => r.enabled)
  const dates = bookingDateOptions(state, now)
  if (!ui.proxyDate || !dates.some((d) => d.date === ui.proxyDate)) ui.proxyDate = today
  if (!ui.proxyCollege) ui.proxyCollege = 'ALL'
  if (!rooms.length) {
    ui.proxyRoomId = 0
    ui.proxyStart = ''
    ui.proxyEnd = ''
    ui.proxySeatId = null
    return
  }
  if (!rooms.some((r) => r.id === ui.proxyRoomId)) ui.proxyRoomId = rooms[0].id
  const room = rooms.find((r) => r.id === ui.proxyRoomId) || rooms[0]
  const starts = startTimeOptions(state, room, ui.proxyDate, now)
  if (!starts.includes(ui.proxyStart)) ui.proxyStart = starts[0] || ''
  const ends = endTimeOptions(state, room, ui.proxyDate, ui.proxyStart, now)
  if (!ends.includes(ui.proxyEnd)) ui.proxyEnd = ends[Math.min(2, ends.length - 1)] || ends[0] || ''
}

function visibleStudents(ctx) {
  const { state, ui } = ctx
  const keyword = String(ui.proxyKeyword || '').trim().toLowerCase()
  return state.users
    .filter((u) => u.role === 'STUDENT')
    .filter((u) => ui.proxyCollege === 'ALL' || collegeOf(u) === ui.proxyCollege)
    .filter((u) => !keyword || [u.name, u.username, u.studentNo, u.className, collegeOf(u)].join(' ').toLowerCase().includes(keyword))
    .sort((a, b) => a.studentNo.localeCompare(b.studentNo))
}

function proxySummary(state, today) {
  const weekAgo = localDate(Date.parse(`${today}T00:00:00+08:00`) - 6 * 86400000)
  const proxy = state.bookings.filter((b) => b.proxy)
  const todayProxy = proxy.filter((b) => b.date === today)
  const weekProxy = proxy.filter((b) => b.date >= weekAgo && b.date <= today)
  return {
    today: todayProxy.length,
    week: weekProxy.length,
    students: new Set(proxy.map((b) => b.userId)).size,
    colleges: new Set(proxy.map((b) => {
      const user = state.users.find((u) => u.id === b.userId)
      return collegeOf(user)
    })).size,
    recent: proxy.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 8)
  }
}

export function renderProxy(ctx) {
  ensureProxyFilters(ctx)
  const { state, now, ui } = ctx
  const today = localDate(now)
  const rooms = state.rooms.filter((r) => r.enabled)
  if (!rooms.length) {
    return emptyState({ iconName: 'building', title: '暂无开放的自习室', text: '请先在房间管理中开放自习室，再为学生代订座位。' })
  }
  const students = visibleStudents(ctx)
  const student = students.find((s) => s.id === Number(ui.proxyStudentId)) || students[0] || null
  if (student) ui.proxyStudentId = student.id
  const room = rooms.find((r) => r.id === ui.proxyRoomId) || rooms[0]
  const seats = student
    ? seatAvailability(state, room.id, ui.proxyDate, ui.proxyStart, ui.proxyEnd, student.id)
    : []
  if (ui.proxySeatId && !seats.some((s) => s.id === ui.proxySeatId && s.state === 'FREE')) ui.proxySeatId = null
  const selected = seats.find((s) => s.id === ui.proxySeatId) || null
  const freeCount = seats.filter((s) => s.state === 'FREE').length
  const rows = [...new Set(seats.map((s) => s.rowNo))].sort((a, b) => a - b)
  const dates = bookingDateOptions(state, now)
  const startOptions = startTimeOptions(state, room, ui.proxyDate, now)
  const endOptions = endTimeOptions(state, room, ui.proxyDate, ui.proxyStart, now)
  const duration = ui.proxyStart && ui.proxyEnd ? timeToMinutes(ui.proxyEnd) - timeToMinutes(ui.proxyStart) : 0
  const black = student ? activeBlacklist(state, student.id) : null
  const summary = student ? violationSummary(state, student.id) : null
  const activeCount = student
    ? state.bookings.filter((b) => b.userId === student.id && ACTIVE_STATUS.includes(b.status)).length
    : 0
  const stats = proxySummary(state, today)
  const canBook = Boolean(student && selected && !black && startOptions.length)

  return `
    <div class="notice notice-info">${icon('user-plus', 20)}<div><strong>管理员代订：为线下咨询、团体活动或特殊学生锁定座位</strong>
      <p>代订会以学生本人身份占用座位与签到窗口，并在预约记录中标记「代订 · 操作人」。签到仍由学生本人完成；如需撤销，可在预约记录中取消。</p></div>
      <button class="btn btn-ghost btn-sm" data-action="nav" data-view="reservations">查看预约记录</button></div>

    <div class="stat-grid four">
      ${statCard({ label: '今日代订', value: stats.today, unit: '条', iconName: 'user-plus', hint: '含待签到与使用中', tone: 'sage' })}
      ${statCard({ label: '近 7 天代订', value: stats.week, unit: '条', iconName: 'calendar', hint: '管理员代学生锁座' })}
      ${statCard({ label: '覆盖学生', value: stats.students, unit: '人', iconName: 'users', tone: 'gold', hint: '历史代订涉及学生数' })}
      ${statCard({ label: '覆盖学院', value: stats.colleges, unit: '个', iconName: 'building', tone: 'clay', hint: '按学生所属学院统计' })}
    </div>

    ${!students.length ? emptyState({ iconName: 'search', title: '没有匹配的学生', text: '调整学院筛选或搜索关键词后再代订。' }) : `
    <div class="proxy-layout">
      <section class="panel">
        ${sectionTitle('代订信息', '先定位学生，再选择日期、时段与座位', chip(student ? `已选 ${esc(student.name)}` : '未选择学生', 'soft'))}
        <div class="filter-row wrap">
          <label class="field compact"><span>学院</span>
            <select data-bind="proxyCollege">
              <option value="ALL" ${ui.proxyCollege === 'ALL' ? 'selected' : ''}>全部学院</option>
              ${COLLEGES.map((c) => `<option value="${esc(c)}" ${ui.proxyCollege === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </label>
          <label class="field compact grow"><span>搜索学生</span>
            <div class="search-box">${icon('search', 15)}<input data-bind="proxyKeyword" placeholder="姓名 / 学号 / 班级" value="${esc(ui.proxyKeyword || '')}"></div>
          </label>
          <label class="field compact grow"><span>代订学生</span>
            <select data-bind="proxyStudentId" data-type="number">
              ${students.map((s) => `<option value="${s.id}" ${s.id === ui.proxyStudentId ? 'selected' : ''}>${esc(s.name)} · ${esc(s.studentNo)} · ${esc(collegeShort(collegeOf(s)))} ${esc(s.className || '')}</option>`).join('')}
            </select>
          </label>
        </div>

        ${student ? `
        <form data-form="proxy-book" class="proxy-form">
          <input type="hidden" name="studentId" value="${student.id}">
          <input type="hidden" name="seatId" value="${selected?.id || ''}">
          <input type="hidden" name="roomId" value="${room.id}">
          <input type="hidden" name="date" value="${ui.proxyDate}">
          <input type="hidden" name="start" value="${ui.proxyStart}">
          <input type="hidden" name="end" value="${ui.proxyEnd}">
          <div class="proxy-student-card">
            ${avatar(student.name, 'STUDENT')}
            <div><strong>${esc(student.name)}</strong>
              <small>${esc(student.studentNo)} · ${esc(collegeOf(student))} ${esc(student.className || '未分班')}</small>
              <small class="muted">有效预约 ${activeCount} 条 · 违约 ${summary?.count || 0} 次</small>
            </div>
            <div class="proxy-student-tags">
              ${black ? chip('黑名单', 'clay') : chip('可预约', 'green')}
              ${chip(maskStudentNo(student.studentNo) || '无学号', 'soft')}
            </div>
          </div>

          <div class="filter-row wrap">
            <label class="field compact"><span>日期</span>
              <select data-bind="proxyDate">
                ${dates.map((d) => `<option value="${d.date}" ${d.date === ui.proxyDate ? 'selected' : ''}>${d.isToday ? '今天' : d.isTomorrow ? '明天' : d.weekday} ${humanDate(d.date)}</option>`).join('')}
              </select>
            </label>
            <label class="field compact"><span>自习室</span>
              <select data-bind="proxyRoomId" data-type="number">
                ${rooms.map((r) => `<option value="${r.id}" ${r.id === room.id ? 'selected' : ''}>${esc(r.name)} · ${esc(r.building)}</option>`).join('')}
              </select>
            </label>
            <label class="field compact"><span>开始时间</span>
              <select data-bind="proxyStart">${startOptions.map((t) => `<option value="${t}" ${t === ui.proxyStart ? 'selected' : ''}>${t}</option>`).join('')}</select>
            </label>
            <label class="field compact"><span>结束时间</span>
              <select data-bind="proxyEnd">${endOptions.map((t) => `<option value="${t}" ${t === ui.proxyEnd ? 'selected' : ''}>${t}</option>`).join('')}</select>
            </label>
            <div class="duration-badge">${icon('clock', 15)} ${duration > 0 ? fmtDuration(duration) : '请选择时段'}</div>
          </div>

          <div class="proxy-seat-head">
            <div><strong>${esc(room.name)}</strong><span class="muted"> ${esc(room.building)} ${room.floor} 层 · ${ui.proxyDate} ${weekdayLabel(ui.proxyDate)} · 可约 ${freeCount} 座</span></div>
            <div class="seat-legend"><span><i class="lg-free"></i>空闲</span><span><i class="lg-reserved"></i>已预约</span><span><i class="lg-mine"></i>该生已约</span><span><i class="lg-disabled"></i>停用</span></div>
          </div>
          <div class="seat-map proxy-seat-map" role="group" aria-label="代订座位图">
            ${rows.map((rowNo) => `<div class="seat-row"><span class="row-label">${rowNo}</span>
              ${seats.filter((s) => s.rowNo === rowNo).map((seat) => {
                const stateClass = seat.state === 'MINE' ? 'is-mine' : seat.state === 'RESERVED' ? 'is-reserved' : seat.state === 'OCCUPIED' ? 'is-occupied' : seat.state === 'DISABLED' ? 'is-disabled' : 'is-free'
                const selectedClass = selected?.id === seat.id ? 'is-selected' : ''
                return `<button type="button" class="seat ${stateClass} ${selectedClass}" data-action="proxy-pick-seat" data-id="${seat.id}" ${seat.state !== 'FREE' ? 'disabled' : ''}
                  title="${esc(seat.code)} · ${seat.type}${seat.state === 'FREE' ? ' · 可代订' : ' · 不可选'}">
                  ${icon('chair', 20)}<strong>${esc(seat.code)}</strong>
                  <span class="seat-tags">${seat.state === 'MINE' ? '<em>已约</em>' : seat.type === '靠窗' ? icon('sun', 11) : seat.type === '插座' ? icon('power', 11) : ''}</span>
                </button>`
              }).join('')}
            </div>`).join('')}
          </div>

          <label class="field"><span>代订用途 / 备注</span>
            <input name="note" maxlength="60" placeholder="例如：数学建模竞赛集训、学生临时无手机需线下代办">
          </label>
          <p class="modal-note">${icon('info', 14)} ${black ? '该学生处于黑名单，需先解除后才能代订。' : selected ? `将为学生预定 ${esc(selected.code)} 座位，时段 ${fmtRange(ui.proxyStart, ui.proxyEnd)}。` : '请在座位图中选择一个空闲座位。'}</p>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" ${!canBook ? 'disabled' : ''}>${icon('user-plus', 16)} 代学生预定</button>
            <span class="muted tiny">代订同样受开放时间、时长与座位冲突校验</span>
          </div>
        </form>` : ''}
      </section>

      <aside class="proxy-side">
        <section class="panel">
          ${sectionTitle('最近代订', '按创建时间倒序，最多 8 条', '')}
          ${stats.recent.length ? `<div class="proxy-log-list">${stats.recent.map((b) => {
            const student = state.users.find((u) => u.id === b.userId)
            const room2 = state.rooms.find((r) => r.id === b.roomId)
            return `<div class="proxy-log">
              <div class="proxy-log-main"><strong>${esc(student?.name || '学生')}</strong><small>${esc(collegeShort(collegeOf(student)))} · ${esc(student?.className || '未分班')}</small></div>
              <div class="proxy-log-meta"><span>${esc(room2?.name || '')} · ${b.date.slice(5)} ${fmtRange(b.start, b.end)}</span><small>操作人 ${esc(b.operatorName || '—')}</small></div>
              ${statusBadge(b.status)}
            </div>`
          }).join('')}</div>` : emptyState({ iconName: 'user-plus', title: '还没有代订记录', text: '为需要的同学代订一次座位，记录会显示在这里。' })}
        </section>
        <section class="rule-note">
          ${icon('shield', 20)}
          <div><h4>代订不是特权</h4><p>代订记录全程留痕：操作人、学生、座位与用途都会写入日志。请只在线下咨询、设备故障或集体活动等必要场景使用，并提醒学生按时签到。</p></div>
        </section>
      </aside>
    </div>`}
  `
}

export function proxyTodayBookings(state, today) {
  return state.bookings.filter((b) => b.proxy && b.date === today)
}
