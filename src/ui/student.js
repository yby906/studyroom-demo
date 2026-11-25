import {
  ACTIVE_STATUS, STATUS, activeBlacklist, bookingsOfUser, bookingDeadlineMs, bookingStartMs,
  bookingDateOptions, seatAvailability, startTimeOptions, endTimeOptions, violationSummary
} from '../core/rules.js'
import { fmtDuration, fmtRange, humanDate, localDate, monthGrid, monthKeyOf, monthLabelOf, timeToMinutes, weekdayLabel } from '../core/time.js'
import { esc, icon, emptyState, statCard, statusBadge } from './components.js'

function ensureFilters(ctx) {
  const { state, now, ui } = ctx
  const today = localDate(now)
  const rooms = state.rooms.filter((r) => r.enabled)
  if (!rooms.length) {
    ui.roomId = 0
    ui.start = ''
    ui.end = ''
    ui.seatId = null
    return
  }
  if (!rooms.some((r) => r.id === ui.roomId)) ui.roomId = rooms[0].id
  if (!ui.date || ui.date < today) ui.date = today
  const room = state.rooms.find((r) => r.id === ui.roomId)
  const starts = startTimeOptions(state, room, ui.date, now)
  if (!starts.includes(ui.start)) ui.start = starts[0] || ''
  const ends = endTimeOptions(state, room, ui.date, ui.start, now)
  if (!ends.includes(ui.end)) ui.end = ends[Math.min(2, ends.length - 1)] || ends[0] || ''
}

function myActiveBookings(ctx) {
  return bookingsOfUser(ctx.state, ctx.user.id).filter((b) => ACTIVE_STATUS.includes(b.status))
}

function daysUntil(deadline, now) {
  const diff = Math.max(0, deadline - now)
  return Math.ceil(diff / 60000)
}

export function renderStudentSeats(ctx) {
  ensureFilters(ctx)
  const { state, user, now, ui } = ctx
  const today = localDate(now)
  const rooms = state.rooms.filter((r) => r.enabled)
  if (!rooms.length) {
    return emptyState({ iconName: 'building', title: '暂无开放的自习室', text: '管理员开放自习室后，这里将显示可预约座位。' })
  }
  const room = state.rooms.find((r) => r.id === ui.roomId)
  const seats = seatAvailability(state, room.id, ui.date, ui.start, ui.end, user.id)
  if (ui.seatId && !seats.some((s) => s.id === ui.seatId && s.state === 'FREE')) ui.seatId = null
  const selected = seats.find((s) => s.id === ui.seatId) || null
  const freeCount = seats.filter((s) => s.state === 'FREE').length
  const rows = [...new Set(seats.map((s) => s.rowNo))].sort((a, b) => a - b)
  const active = myActiveBookings(ctx)
  const black = activeBlacklist(state, user.id)
  const dates = bookingDateOptions(state, now)
  const startOptions = startTimeOptions(state, room, ui.date, now)
  const endOptions = endTimeOptions(state, room, ui.date, ui.start, now)
  const duration = selected && ui.start && ui.end
    ? timeToMinutes(ui.end) - timeToMinutes(ui.start)
    : timeToMinutes(ui.end) - timeToMinutes(ui.start)
  const hasSlots = startOptions.length > 0
  const canBook = Boolean(selected) && !black && hasSlots

  return `
    ${black ? `<div class="notice notice-danger">${icon('shield', 20)}<div><strong>账号处于预约黑名单</strong><p>${esc(black.reason)}。你仍可查看座位与个人记录，但暂不能发起新预约。如有异议请联系自习室管理员。</p></div><button class="btn btn-ghost btn-sm" data-action="nav" data-view="violations">查看违约记录</button></div>` : ''}
    ${!hasSlots ? `<div class="notice notice-warning">${icon('clock', 20)}<div><strong>当前日期已无可预约时段</strong><p>${ui.date === localDate(now) ? '今天的开放时段已结束或剩余时间不足签到窗口，请选择明天或之后的日期。' : '该自习室当天没有可用时段，请选择其他日期。'}</p></div></div>` : ''}

    <div class="stat-grid three">
      ${statCard({ label: '开放自习室', value: rooms.length, unit: '间', iconName: 'building', hint: '当前可预约空间' })}
      ${statCard({ label: '所选时段可约座位', value: freeCount, unit: '个', iconName: 'chair', hint: `${room.name} · ${fmtRange(ui.start, ui.end)}`, tone: 'sage' })}
      ${statCard({ label: '我的有效预约', value: active.length, unit: '条', iconName: 'calendar', hint: active.length ? '请留意签到时间' : '还没有进行中的预约', tone: 'gold' })}
    </div>

    <section class="panel filter-panel">
      <div class="date-strip">
        ${dates.map((d) => `<button class="date-chip ${ui.date === d.date ? 'active' : ''}" data-action="pick-date" data-date="${d.date}">
          <span>${d.isToday ? '今天' : d.isTomorrow ? '明天' : d.weekday}</span><strong>${humanDate(d.date)}</strong>
        </button>`).join('')}
      </div>
      <div class="filter-row">
        <label class="field compact"><span>自习室</span>
          <select data-bind="roomId" data-type="number" data-refresh="student">
            ${rooms.map((r) => `<option value="${r.id}" ${r.id === room.id ? 'selected' : ''}>${esc(r.name)} · ${esc(r.building)}</option>`).join('')}
          </select>
        </label>
        <label class="field compact"><span>开始时间</span>
          <select data-bind="start" data-refresh="student">
            ${startOptions.map((t) => `<option value="${t}" ${t === ui.start ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <label class="field compact"><span>结束时间</span>
          <select data-bind="end" data-refresh="student">
            ${endOptions.map((t) => `<option value="${t}" ${t === ui.end ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </label>
        <div class="duration-badge">${icon('clock', 15)} ${duration > 0 ? fmtDuration(duration) : '请选择时段'}</div>
      </div>
    </section>

    <div class="seat-layout">
      <section class="panel seat-panel">
        <div class="seat-panel-head">
          <div>
            <h3>${esc(room.name)} <span class="room-status ${room.enabled ? 'open' : 'closed'}">${room.enabled ? '开放中' : '已停用'}</span></h3>
            <p class="muted">${icon('pin', 14)} ${esc(room.campus)} · ${esc(room.building)} ${room.floor} 层 · 开放 ${room.openTime}–${room.closeTime}</p>
          </div>
          <div class="seat-legend">
            <span><i class="lg-free"></i>空闲</span><span><i class="lg-reserved"></i>已预约</span><span><i class="lg-mine"></i>我的</span><span><i class="lg-disabled"></i>停用</span>
          </div>
        </div>
        <div class="front-label"><span>讲 台 方 向 · 请 保 持 安 静</span></div>
        <div class="seat-map" role="group" aria-label="座位图">
          ${rows.map((rowNo) => `<div class="seat-row">
            <span class="row-label">${rowNo}</span>
            ${seats.filter((s) => s.rowNo === rowNo).map((seat) => {
              const stateClass = seat.state === 'MINE' ? 'is-mine' : seat.state === 'RESERVED' ? 'is-reserved' : seat.state === 'OCCUPIED' ? 'is-occupied' : seat.state === 'DISABLED' ? 'is-disabled' : 'is-free'
              const selectedClass = selected?.id === seat.id ? 'is-selected' : ''
              const disabled = seat.state !== 'FREE'
              return `<button class="seat ${stateClass} ${selectedClass}" data-action="pick-seat" data-id="${seat.id}" ${disabled ? 'disabled' : ''}
                title="${esc(seat.code)} · ${seat.type}${seat.state === 'RESERVED' ? ' · 已被预约' : seat.state === 'OCCUPIED' ? ' · 使用中' : seat.state === 'MINE' ? ' · 我的预约' : seat.state === 'DISABLED' ? ' · 维修停用' : ' · 可预约'}"
                aria-label="座位 ${esc(seat.code)} ${seat.state}">
                ${icon('chair', 20)}
                <strong>${esc(seat.code)}</strong>
                <span class="seat-tags">${seat.state === 'MINE' ? '<em>我的</em>' : seat.type === '靠窗' ? icon('sun', 11) : seat.type === '插座' ? icon('power', 11) : ''}</span>
              </button>`
            }).join('')}
          </div>`).join('')}
        </div>
        <div class="seat-foot">
          <span>${icon('info', 14)} 共 ${seats.length} 个座位，当前可预约 ${freeCount} 个；已预约/使用中 ${seats.filter((s) => ['RESERVED', 'OCCUPIED', 'MINE'].includes(s.state)).length} 个，维修停用 ${seats.filter((s) => s.state === 'DISABLED').length} 个。</span>
          <span>座位状态每 30 秒自动刷新</span>
        </div>
      </section>

      <aside class="selection-side">
        <section class="panel selection-card">
          <span class="eyebrow green">YOUR SELECTION</span>
          <h3>预约信息</h3>
          <div class="selected-seat ${selected ? 'has-seat' : ''}">
            <strong>${selected ? esc(selected.code) : '—'}</strong>
            <span>${selected ? `${selected.type} · 第 ${selected.rowNo} 排` : '点击左侧空闲座位进行选择'}</span>
          </div>
          <dl class="detail-list">
            <div><dt>自习室</dt><dd>${esc(room.name)}</dd></div>
            <div><dt>位置</dt><dd>${esc(room.building)} ${room.floor} 层</dd></div>
            <div><dt>预约日期</dt><dd>${ui.date} ${weekdayLabel(ui.date)}</dd></div>
            <div><dt>使用时段</dt><dd>${fmtRange(ui.start, ui.end)}</dd></div>
            <div><dt>时长</dt><dd>${duration > 0 ? fmtDuration(duration) : '—'}</dd></div>
            <div><dt>签到窗口</dt><dd>开始后 ${state.config.checkinWindow} 分钟内</dd></div>
          </dl>
          <button class="btn btn-primary btn-full" data-action="open-book" ${!canBook ? 'disabled' : ''}>
            ${black ? '黑名单不可预约' : '确认预约'} ${icon('arrow', 17)}
          </button>
          <p class="selection-note">${!selected ? '请选择一个空闲座位。' : black ? '请先联系管理员解除黑名单。' : '预约成功后，请在签到窗口内完成签到。'}</p>
        </section>
        <section class="rule-note">
          ${icon('spark', 20)}
          <div><h4>把座位留给真正需要的人</h4><p>同一时段每人仅保留一个有效预约；未按时签到将释放座位并计入违约，累计 ${state.config.violationThreshold} 次自动加入黑名单。</p></div>
        </section>
      </aside>
    </div>`
}

export function renderStudentMine(ctx) {
  const { state, user, now, ui } = ctx
  const all = bookingsOfUser(state, user.id)
  const filter = ui.mineStatus || 'ALL'
  const keyword = String(ui.mineKeyword || '').trim().toLowerCase()
  const visible = all.filter((b) =>
    (filter === 'ALL' || b.status === filter) &&
    (!keyword || [b.roomName, b.seatCode, b.date, b.start, b.end].join(' ').toLowerCase().includes(keyword))
  )
  const counts = all.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc }, {})
  const active = all.filter((b) => ACTIVE_STATUS.includes(b.status))
  const tabs = [
    ['ALL', '全部', all.length], ['WAITING', '待签到', counts.WAITING || 0], ['CHECKED_IN', '使用中', counts.CHECKED_IN || 0],
    ['COMPLETED', '已完成', counts.COMPLETED || 0], ['CANCELLED', '已取消', counts.CANCELLED || 0], ['MISSED', '已失约', counts.MISSED || 0]
  ]
  return `
    ${active.length ? `<div class="notice notice-info">${icon('calendar', 20)}<div><strong>你有 ${active.length} 条待使用或使用中的预约</strong><p>请在预约开始后 ${state.config.checkinWindow} 分钟内签到；结束使用后记得签退，让座位更快回到空闲状态。</p></div></div>` : ''}
    <section class="panel">
      ${sectionTitleLocal('我的预约记录', `共 ${all.length} 条 · 点击状态筛选，或搜索座位、自习室与日期`,
        `<div class="search-box">${icon('search', 16)}<input data-bind="mineKeyword" data-refresh="student" placeholder="搜索自习室 / 座位 / 日期" value="${esc(ui.mineKeyword || '')}"></div>`)}
      <div class="tab-row">
        ${tabs.map(([key, label, count]) => `<button class="tab ${filter === key ? 'active' : ''}" data-action="set-mine-filter" data-value="${key}">${label}<span>${count}</span></button>`).join('')}
      </div>
      ${visible.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>预约位置</th><th>日期与时段</th><th>状态</th><th>签到 / 截止</th><th class="align-right">操作</th></tr></thead>
        <tbody>${visible.map((b) => reservationRow(ctx, b)).join('')}</tbody>
      </table></div>` : emptyState({
        iconName: 'calendar', title: '还没有相关预约',
        text: keyword ? '没有匹配的预约，试试其他关键词。' : '为下一次专注，先预约一个安静的座位吧。',
        action: `<button class="btn btn-primary" data-action="nav" data-view="seats">去预约座位 ${icon('arrow', 16)}</button>`
      })}
    </section>`
}

function sectionTitleLocal(title, desc, action) {
  return `<div class="section-title"><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div><div class="section-action">${action || ''}</div></div>`
}

function reservationRow(ctx, booking) {
  const { state, now } = ctx
  const startMs = bookingStartMs(booking)
  const deadline = bookingDeadlineMs(booking)
  const canCheckin = booking.status === STATUS.WAITING && now >= startMs && now < deadline
  const canCancel = booking.status === STATUS.WAITING && now < startMs
  const canCheckout = booking.status === STATUS.CHECKED_IN
  const remaining = Math.ceil((deadline - now) / 60000)
  const toStart = Math.ceil((startMs - now) / 60000)
  const actions = []
  if (canCheckin) actions.push(`<button class="btn btn-primary btn-xs" data-action="checkin" data-id="${booking.id}">立即签到</button>`)
  if (booking.status === STATUS.WAITING && now < deadline) actions.push(`<button class="btn btn-ghost btn-xs" data-action="open-checkin-qr" data-id="${booking.id}">${icon('qr', 13)} 签到码</button>`)
  if (canCheckout) actions.push(`<button class="btn btn-primary btn-xs" data-action="checkout" data-id="${booking.id}">离场签退</button>`)
  if (canCancel) actions.push(`<button class="btn btn-ghost btn-xs" data-action="open-cancel" data-id="${booking.id}">取消预约</button>`)
  if (booking.status === STATUS.WAITING && now < startMs) actions.push(`<button class="btn btn-ghost btn-xs" data-action="jump-book" data-id="${booking.id}">跳到签到时间</button>`)
  if (!actions.length) actions.push('<span class="muted tiny">—</span>')
  const statusHint = booking.status === STATUS.WAITING
    ? (now < startMs
      ? (booking.date !== localDate(now) ? `${booking.date.slice(5)} ${booking.start} 开始` : (toStart > 0 ? `${toStart} 分钟后开始` : '即将开始'))
      : remaining > 0 ? `签到剩余 ${remaining} 分钟` : '签到窗口已结束')
    : booking.status === STATUS.CHECKED_IN ? '使用中，离场时请签退' : ''
  return `<tr>
    <td><div class="cell-main"><strong>${esc(booking.roomName)} · ${esc(booking.seatCode)}</strong><small>${esc(booking.code)} · ${esc(booking.seatType)}</small></div></td>
    <td><div class="cell-main"><strong>${booking.date} ${fmtRange(booking.start, booking.end)}</strong><small>${fmtDuration(booking.duration)}</small></div></td>
    <td>${statusBadge(booking.status)}${statusHint ? `<small class="cell-hint">${statusHint}</small>` : ''}${booking.cancelReason ? `<small class="cell-hint">${esc(booking.cancelReason)}</small>` : ''}</td>
    <td><div class="cell-main"><strong>${booking.checkedInAt ? booking.checkedInAt.slice(11, 16) : '—'}</strong><small>截止 ${booking.checkinDeadline.slice(5, 16).replace('T', ' ')}</small></div></td>
    <td class="align-right"><div class="row-actions">${actions.join('')}</div></td>
  </tr>`
}

export function renderStudentViolations(ctx) {
  const { state, user } = ctx
  const summary = violationSummary(state, user.id)
  const active = summary.active
  const remaining = Math.max(0, summary.threshold - summary.count)
  const bookingMap = new Map(state.bookings.map((b) => [b.id, b]))
  const entries = summary.entries.map((v) => {
    const booking = bookingMap.get(v.bookingId)
    return { ...v, booking }
  })
  return `
    <div class="stat-grid three">
      ${statCard({ label: '累计违约', value: summary.count, unit: '次', iconName: 'alert', hint: `阈值 ${summary.threshold} 次`, tone: summary.count ? 'clay' : 'green' })}
      ${statCard({ label: '距离黑名单', value: active ? '已触发' : remaining, unit: active ? '' : '次', iconName: 'shield', hint: active ? '请联系管理员解除' : '保持按时签到即可避免', tone: active ? 'danger' : 'sage' })}
      ${statCard({ label: '当前信用状态', value: active ? '受限' : '正常', iconName: active ? 'lock' : 'check', hint: active ? '暂不能发起新预约' : '可正常预约座位', tone: active ? 'danger' : 'green' })}
    </div>
    ${active ? `<div class="notice notice-danger">${icon('lock', 20)}<div><strong>预约权限已受限</strong><p>触发原因：${esc(active.reason)}。解除需由自习室管理员核实并填写依据，历史违约记录会保留。</p></div></div>`
      : `<div class="notice notice-success">${icon('check', 20)}<div><strong>信用状态正常</strong><p>按时签到、及时取消或签退不会产生违约。当前已累计 ${summary.count} 次违约，再发生 ${remaining} 次将触发黑名单。</p></div></div>`}
    <section class="panel">
      ${sectionTitleLocal('违约记录', '违约记录只读，作为黑名单判定与解除审核的依据', '')}
      ${entries.length ? `<div class="violation-list">${entries.map((entry) => `<div class="violation-item">
        <span class="violation-icon">${icon('alert', 18)}</span>
        <div class="violation-main">
          <strong>超时未签到</strong>
          <p>${entry.booking ? `${esc(state.rooms.find((r) => r.id === entry.booking.roomId)?.name || '')} · ${esc(state.seats.find((s) => s.id === entry.booking.seatId)?.code || '')} · ${entry.booking.date} ${fmtRange(entry.booking.start, entry.booking.end)}` : '关联预约已归档'}</p>
          <small>${esc(entry.note)}</small>
        </div>
        <div class="violation-meta"><span class="status status-missed"><i></i>违约 +1</span><small>${entry.createdAt.slice(0, 16)}</small></div>
      </div>`).join('')}</div>` : emptyState({ iconName: 'shield', title: '没有违约记录', text: '继续保持按时签到的好习惯，信用状态会一直保持正常。' })}
    </section>
    <section class="panel rules-panel">
      ${sectionTitleLocal('违约与黑名单规则', '系统自动判定，管理员只负责查询、核实与解除', '')}
      <div class="rule-grid">
        <article><span>01</span><h4>什么情况会违约</h4><p>预约成功后未在签到窗口内签到，预约被置为“已失约”，座位自动释放并生成一条违约记录。</p></article>
        <article><span>02</span><h4>黑名单如何触发</h4><p>累计违约次数达到 ${summary.threshold} 次，系统自动加入黑名单；黑名单仅由系统按阈值加入，管理员不能手动加入。</p></article>
        <article><span>03</span><h4>如何解除</h4><p>联系自习室管理员核实情况，管理员填写解除原因后可恢复预约权限；历史违约记录不会删除。</p></article>
      </div>
    </section>`
}

function calendarActions(ctx, booking) {
  const actions = []
  if (booking.status === STATUS.WAITING) {
    const startMs = bookingStartMs(booking)
    const deadline = bookingDeadlineMs(booking)
    if (ctx.now >= startMs && ctx.now < deadline) {
      actions.push(`<button class="btn btn-primary btn-xs" data-action="checkin" data-id="${booking.id}">立即签到</button>`)
    }
    if (ctx.now < deadline) {
      actions.push(`<button class="btn btn-ghost btn-xs" data-action="open-checkin-qr" data-id="${booking.id}">${icon('qr', 13)} 签到码</button>`)
    }
    if (ctx.now < startMs) {
      actions.push(`<button class="btn btn-ghost btn-xs" data-action="open-cancel" data-id="${booking.id}">取消预约</button>`)
      actions.push(`<button class="btn btn-ghost btn-xs" data-action="jump-book" data-id="${booking.id}">跳到签到时间</button>`)
    }
  } else if (booking.status === STATUS.CHECKED_IN) {
    actions.push(`<button class="btn btn-primary btn-xs" data-action="checkout" data-id="${booking.id}">离场签退</button>`)
  }
  return actions.length ? actions.join('') : '<span class="muted tiny">—</span>'
}

export function renderStudentCalendar(ctx) {
  const { state, user, now, ui } = ctx
  const all = bookingsOfUser(state, user.id)
  const today = localDate(now)
  const month = ui.calendarMonth || monthKeyOf(now)
  const grid = monthGrid(month)
  let selectedDate = ui.calendarDate
  if (!selectedDate || !grid.some((cell) => cell.date === selectedDate)) {
    selectedDate = today.startsWith(month) ? today : `${month}-01`
    ui.calendarDate = selectedDate
  }
  const byDate = new Map()
  for (const booking of all) {
    const list = byDate.get(booking.date) || []
    list.push(booking)
    byDate.set(booking.date, list)
  }
  for (const list of byDate.values()) list.sort((a, b) => a.start.localeCompare(b.start))
  const monthBookings = all.filter((b) => b.date.startsWith(month))
  const activeCount = monthBookings.filter((b) => ACTIVE_STATUS.includes(b.status)).length
  const completedCount = monthBookings.filter((b) => b.status === STATUS.COMPLETED).length
  const missedCount = monthBookings.filter((b) => b.status === STATUS.MISSED).length
  const selectedBookings = byDate.get(selectedDate) || []
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return `
    <div class="stat-grid four">
      ${statCard({ label: '本月预约', value: monthBookings.length, unit: '条', iconName: 'calendar', hint: monthLabelOf(month) })}
      ${statCard({ label: '待签到 / 使用中', value: activeCount, unit: '条', iconName: 'clock', tone: 'sage', hint: '请留意签到窗口' })}
      ${statCard({ label: '本月已完成', value: completedCount, unit: '条', iconName: 'check', tone: 'green', hint: '含主动签退与自动完成' })}
      ${statCard({ label: '本月失约', value: missedCount, unit: '条', iconName: 'alert', tone: missedCount ? 'clay' : 'green', hint: `累计违约 ${state.violations.filter((v) => v.userId === user.id).length} 次` })}
    </div>

    <section class="panel calendar-toolbar">
      <div class="calendar-heading">
        <div><span class="eyebrow green">MONTHLY OVERVIEW</span><h2>${monthLabelOf(month)}</h2><p>把已预约的时段留在日历上，提前安排复习与休息。</p></div>
        <div class="calendar-controls">
          <button class="icon-btn" data-action="calendar-prev" aria-label="上个月" title="上个月">${icon('chevron-left', 18)}</button>
          <button class="btn btn-ghost btn-sm" data-action="calendar-today">回到本月</button>
          <button class="icon-btn" data-action="calendar-next" aria-label="下个月" title="下个月">${icon('arrow', 18)}</button>
        </div>
      </div>
    </section>

    <div class="calendar-layout">
      <section class="panel calendar-panel">
        <div class="calendar-weekhead">${weekdays.map((day) => `<span>${day}</span>`).join('')}</div>
        <div class="calendar-grid">
          ${grid.map((cell) => {
            const dayBookings = byDate.get(cell.date) || []
            const isToday = cell.date === today
            const isSelected = cell.date === selectedDate
            const classes = ['cal-cell', !cell.inMonth ? 'is-outside' : '', isToday ? 'is-today' : '', isSelected ? 'is-selected' : '', dayBookings.length ? 'has-bookings' : ''].filter(Boolean).join(' ')
            return `<button class="${classes}" data-action="calendar-select" data-date="${cell.date}" aria-label="${cell.date}，${dayBookings.length} 条预约">
              <span class="cal-day">${cell.day}${isToday ? '<i>今天</i>' : ''}</span>
              <span class="cal-bookings">
                ${cell.inMonth ? dayBookings.slice(0, 2).map((b) => `<span class="cal-chip cal-${b.status.toLowerCase()}">${fmtRange(b.start, b.end).split('–')[0]} ${esc(b.seatCode)}</span>`).join('') : ''}
                ${cell.inMonth && dayBookings.length > 2 ? `<span class="cal-more">+${dayBookings.length - 2} 条</span>` : ''}
              </span>
            </button>`
          }).join('')}
        </div>
        <div class="calendar-legend">
          <span><i class="cal-dot-waiting"></i>待签到</span>
          <span><i class="cal-dot-checked"></i>使用中</span>
          <span><i class="cal-dot-completed"></i>已完成</span>
          <span><i class="cal-dot-cancelled"></i>已取消</span>
          <span><i class="cal-dot-missed"></i>已失约</span>
        </div>
      </section>

      <aside class="calendar-side">
        <section class="panel calendar-day-panel">
          <div class="calendar-day-head">
            <div><span class="eyebrow green">SELECTED DAY</span><h3>${humanDate(selectedDate)} <small>${weekdayLabel(selectedDate)}</small></h3></div>
            <span class="chip chip-soft">${selectedBookings.length} 条预约</span>
          </div>
          ${selectedBookings.length ? `<div class="calendar-day-list">${selectedBookings.map((b) => `<article class="calendar-booking">
            <div class="cal-booking-top"><span class="cal-booking-time">${fmtRange(b.start, b.end)}</span>${statusBadge(b.status, b.statusLabel)}</div>
            <strong>${esc(b.roomName)} · ${esc(b.seatCode)}</strong>
            <small>${esc(b.code)} · ${fmtDuration(b.duration)}</small>
            <div class="row-actions">${calendarActions(ctx, b)}</div>
          </article>`).join('')}</div>` : emptyState({
            iconName: 'calendar', title: '这一天还没有预约',
            text: '挑一个空闲时段，把专注写进日历。',
            action: `<button class="btn btn-primary btn-sm" data-action="nav" data-view="seats">去预约座位 ${icon('arrow', 15)}</button>`
          })}
        </section>
        <section class="rule-note">${icon('info', 20)}<div><h4>日历中的状态</h4><p>待签到预约可打开“签到码”进行二维码签到演示；使用中的预约请离场时签退。已取消、已失约与已完成记录会保留在日历中。</p></div></section>
      </aside>
    </div>`
}

export function renderStudentGuide(ctx) {  const { state } = ctx
  const c = state.config
  const steps = [
    { n: '01', title: '选择日期与时段', text: `可预约今天起 ${c.advanceDays} 天内的座位，单次 ${c.minDuration}–${c.maxDuration} 分钟，按 ${c.minDuration} 分钟为粒度。`, icon: 'calendar' },
    { n: '02', title: '挑选空闲座位', text: '座位图展示空闲、已预约、使用中、维修停用与本人预约；同一时段每人只保留一个有效预约。', icon: 'chair' },
    { n: '03', title: '按时签到入座', text: `预约开始后 ${c.checkinWindow} 分钟内签到；当前时段补约时，从提交时刻起计算 ${c.checkinWindow} 分钟。`, icon: 'check' },
    { n: '04', title: '离场主动签退', text: '结束使用后点击“离场签退”，预约完成、座位立即释放；未签退时，时段结束由系统自动完成。', icon: 'logout' }
  ]
  return `
    <section class="guide-hero panel">
      <div><span class="eyebrow green">A GUIDE TO BETTER STUDY</span><h2>预约有序，专注自在。</h2><p>从选座到离场，四步完成一次文明、高效的自习预约。</p></div>
      ${icon('book', 64, 'guide-hero-icon')}
    </section>
    <div class="guide-steps">
      ${steps.map((step) => `<section class="panel guide-step"><span class="step-no">${step.n}</span><span class="step-icon">${icon(step.icon, 22)}</span><h3>${step.title}</h3><p>${step.text}</p></section>`).join('')}
    </div>
    <section class="panel">
      ${sectionTitleLocal('常见问题', '规则与状态说明', '')}
      <div class="faq-grid">
        <article><h4>预约开始后还能取消吗？</h4><p>不能。预约一旦进入签到时段即不可取消。如已到馆请签到；如未到馆，系统将在签到窗口结束后按超时未签到处理。</p></article>
        <article><h4>可以提前离场吗？</h4><p>可以。签退后按实际使用时长记录，预约状态变为已完成，座位立即释放，不记违约。</p></article>
        <article><h4>座位为什么会自动释放？</h4><p>取消预约、离场签退、超时未签到或预约时段结束，系统都会释放座位，避免座位长期停留在占用状态。</p></article>
        <article><h4>数据保存在哪里？</h4><p>本演示不连接数据库或后端，全部数据保存在当前浏览器的 localStorage。清除浏览器站点数据或点击“重置演示数据”会恢复初始示例数据。</p></article>
      </div>
    </section>`
}
