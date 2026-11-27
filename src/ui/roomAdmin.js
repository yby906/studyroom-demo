import {
  ACTION_LABELS, STATUS, STATUS_LABELS, activeBlacklist, buildReportRows, buildStats, classOf, collegeOf, collegeShort, enrichBooking,
  maskStudentNo, roomLocation, roomOpenHours, roomSeatCount, seatsOfRoom, violationSummary
} from '../core/rules.js'
import { addDays, dateList, fmtDuration, fmtRange, humanDate, localDate, localTime, weekdayLabel } from '../core/time.js'
import { esc, icon, emptyState, statCard, statusBadge, sectionTitle, lineChart, barChart, rankBar, pct, progress, chip } from './components.js'

function todayOf(ctx) {
  return localDate(ctx.now)
}

function dateRangeLabel(from, to) {
  return from === to ? humanDate(from) : `${humanDate(from)} – ${humanDate(to)}`
}

export function renderAdminDashboard(ctx) {
  const { state, now } = ctx
  const today = todayOf(ctx)
  const stats = buildStats(state, { from: addDays(today, -6), to: today, now })
  const todayStats = buildStats(state, { from: today, to: today, now })
  const activeBlack = state.blacklist.filter((b) => b.status === 'ACTIVE')
  const proxyToday = state.bookings.filter((b) => b.proxy && b.date === today).length
  const recent = state.bookings
    .filter((b) => b.date === today)
    .map((b) => enrichBooking(state, b))
    .sort((a, b) => (b.start + b.id).localeCompare(a.start + a.id))
    .slice(0, 6)
  const trend = stats.byDay.map((d) => ({ label: d.date.slice(5), value: d.total }))
  const rooms = state.rooms.map((room) => {
    const roomToday = state.bookings.filter((b) => b.roomId === room.id && b.date === today && b.status !== STATUS.CANCELLED)
    const active = roomToday.filter((b) => [STATUS.WAITING, STATUS.CHECKED_IN].includes(b.status)).length
    return { room, total: roomToday.length, active, seatCount: roomSeatCount(state, room.id) }
  })
  return `
    <div class="stat-grid four">
      ${statCard({ label: '今日预约', value: todayStats.total, unit: '条', iconName: 'calendar', hint: '含已完成与已取消', tone: 'green' })}
      ${statCard({ label: '待签到 / 使用中', value: `${todayStats.waiting} / ${todayStats.checkedIn}`, unit: '', iconName: 'chair', hint: '实时座位状态', tone: 'sage' })}
      ${statCard({ label: '今日失约', value: todayStats.missed, unit: '条', iconName: 'alert', hint: `累计违约 ${state.violations.length} 条`, tone: todayStats.missed ? 'clay' : 'green' })}
      ${statCard({ label: '今日座位利用率', value: pct(todayStats.utilization, 1), iconName: 'chart', hint: `可用座位 ${state.rooms.filter((r) => r.enabled).reduce((sum, r) => sum + roomSeatCount(state, r.id, true), 0)} 个`, tone: 'gold' })}
    </div>

    ${activeBlack.length ? `<div class="notice notice-warning">${icon('shield', 20)}<div><strong>${activeBlack.length} 名学生处于黑名单</strong><p>黑名单由系统按违约阈值自动加入。请核实违约记录后，在“违约与黑名单”中填写依据并解除。</p></div><button class="btn btn-ghost btn-sm" data-action="nav" data-view="violations">前往处理</button></div>` : ''}

    <div class="dashboard-grid">
      <section class="panel">
        ${sectionTitle('近 7 天预约趋势', `${dateRangeLabel(addDays(today, -6), today)} · 数据按预约日期统计`, `<span class="chip chip-soft">${stats.total} 条预约</span>`)}
        ${lineChart(trend, { unit: ' 条' })}
        <div class="chart-foot"><span>签到率 <strong>${pct(stats.checkinRate)}</strong></span><span>取消率 <strong>${pct(stats.cancelRate)}</strong></span><span>座位利用率 <strong>${pct(stats.utilization)}</strong></span></div>
      </section>
      <section class="panel">
        ${sectionTitle('今日时段分布', '预约开始时间分布，用于安排值班与巡检', '')}
        ${barChart(todayStats.byHour, { label: '今日时段分布', unit: ' 条' })}
        <div class="chart-foot"><span>高峰时段 <strong>${todayStats.peakHour}</strong></span><span>平均使用 <strong>${fmtDuration(Math.round(todayStats.avgDuration))}</strong></span></div>
      </section>
    </div>

    <section class="panel">
      ${sectionTitle('自习室运行概况', '停用仅停止新预约，已有预约按原规则继续', `<button class="btn btn-ghost btn-sm" data-action="nav" data-view="rooms">管理自习室 ${icon('arrow', 15)}</button>`)}
      <div class="room-grid">
        ${rooms.map(({ room, total, active, seatCount }) => `<article class="room-card ${room.enabled ? '' : 'is-closed'}">
          <div class="room-card-head"><div><strong>${esc(room.name)}</strong><p>${icon('pin', 13)} ${esc(roomLocation(room))}</p></div><span class="room-status ${room.enabled ? 'open' : 'closed'}">${room.enabled ? '开放' : '停用'}</span></div>
          <div class="room-card-stats"><span><small>座位</small><strong>${seatCount}</strong></span><span><small>今日预约</small><strong>${total}</strong></span><span><small>进行中</small><strong>${active}</strong></span></div>
          <div class="room-card-foot"><span>${room.openTime}–${room.closeTime}</span><button class="text-btn" data-action="open-room" data-id="${room.id}">编辑信息 ${icon('arrow', 13)}</button></div>
        </article>`).join('')}
      </div>
    </section>

    <section class="panel">
      ${sectionTitle('今日预约动态', '按开始时间展示', `${proxyToday ? chip(`今日代订 ${proxyToday} 条`, 'gold') : ''}<button class="btn btn-ghost btn-sm" data-action="nav" data-view="proxy">${icon('user-plus', 14)} 代订座位</button><button class="btn btn-ghost btn-sm" data-action="nav" data-view="reservations">查看全部 ${icon('arrow', 15)}</button>`)}
      ${recent.length ? `<div class="table-wrap"><table class="data-table compact">
        <thead><tr><th>学生</th><th>座位</th><th>时段</th><th>状态</th><th>签到时间</th></tr></thead>
        <tbody>${recent.map((b) => `<tr>
          <td><div class="cell-main"><strong>${esc(b.studentName)}</strong><small>${esc(maskStudentNo(b.studentNo) || b.studentUsername)}</small></div></td>
          <td>${esc(b.roomName)} · ${esc(b.seatCode)}</td>
          <td>${fmtRange(b.start, b.end)}</td>
          <td>${statusBadge(b.status, b.statusLabel)}</td>
          <td>${b.checkedInAt ? b.checkedInAt.slice(11, 16) : '—'}</td>
        </tr>`).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'calendar', title: '今天还没有预约', text: '新的预约会实时显示在这里。' })}
    </section>`
}

export function renderAdminRooms(ctx) {
  const { state } = ctx
  const today = todayOf(ctx)
  const rooms = state.rooms.map((room) => {
    const seats = seatsOfRoom(state, room.id)
    const todayBookings = state.bookings.filter((b) => b.roomId === room.id && b.date === today)
    const active = todayBookings.filter((b) => [STATUS.WAITING, STATUS.CHECKED_IN].includes(b.status)).length
    const disabledSeats = seats.filter((s) => !s.enabled).length
    return { room, seats, active, todayBookings, disabledSeats }
  })
  return `
    <section class="panel">
      ${sectionTitle('自习室房间', '房间是座位维护与预约开放的前提；存在预约记录的房间不可删除', `<button class="btn btn-primary" data-action="open-room">${icon('plus', 16)} 新增自习室</button>`)}
      <div class="table-wrap"><table class="data-table rooms-table">
        <thead><tr><th>房间</th><th>位置与开放时间</th><th>座位</th><th>今日预约</th><th>状态</th><th class="align-right">操作</th></tr></thead>
        <tbody>${rooms.map(({ room, seats, active, todayBookings, disabledSeats }) => `<tr>
          <td><div class="cell-main"><strong>${esc(room.name)}</strong><small>${esc(room.description || '—')}</small></div></td>
          <td><div class="cell-main"><strong>${esc(roomLocation(room))}</strong><small>${room.openTime}–${room.closeTime} · 每天 ${roomOpenHours(room).toFixed(1)} 小时</small></div></td>
          <td><div class="cell-main"><strong>${seats.length}</strong><small>${disabledSeats ? `${disabledSeats} 个维修停用` : '全部启用'}</small></div></td>
          <td><div class="cell-main"><strong>${todayBookings.length}</strong><small>进行中 ${active} 条</small></div></td>
          <td><span class="room-status ${room.enabled ? 'open' : 'closed'}">${room.enabled ? '开放中' : '已停用'}</span></td>
          <td class="align-right"><div class="row-actions">
            <button class="btn btn-ghost btn-xs" data-action="open-room" data-id="${room.id}">${icon('edit', 13)} 编辑</button>
            <button class="btn btn-ghost btn-xs" data-action="toggle-room" data-id="${room.id}">${room.enabled ? '停用' : '开放'}</button>
            <button class="btn btn-danger-ghost btn-xs" data-action="delete-room" data-id="${room.id}">${icon('trash', 13)} 删除</button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="insight-grid">
      <article class="panel insight-card">${icon('info', 22)}<div><h4>停用与删除的差别</h4><p>停用自习室仅停止新预约，已有预约仍按原规则签到、完成或失约；存在任何预约记录的房间不可删除，以保证历史数据完整。</p></div></article>
      <article class="panel insight-card">${icon('chair', 22)}<div><h4>座位与开放时间</h4><p>修改房间开放时间不会改变已产生的预约；座位维护请进入“座位管理”，可按房间批量生成或逐个停用。</p></div></article>
    </section>`
}

export function renderAdminSeats(ctx) {
  const { state, ui } = ctx
  const rooms = state.rooms
  if (!rooms.length) return emptyState({ iconName: 'building', title: '还没有自习室', text: '请先在房间管理中创建自习室。', action: `<button class="btn btn-primary" data-action="open-room">新增自习室</button>` })
  if (!rooms.some((r) => r.id === ui.adminSeatRoomId)) ui.adminSeatRoomId = rooms[0].id
  const room = rooms.find((r) => r.id === ui.adminSeatRoomId)
  const seats = seatsOfRoom(state, room.id).slice().sort((a, b) => a.rowNo - b.rowNo || a.colNo - b.colNo)
  const enabled = seats.filter((s) => s.enabled).length
  const maintenance = seats.length - enabled
  const activeBookings = state.bookings.filter((b) => b.roomId === room.id && [STATUS.WAITING, STATUS.CHECKED_IN].includes(b.status))
  return `
    <div class="stat-grid four">
      ${statCard({ label: '当前房间座位', value: seats.length, unit: '个', iconName: 'chair', hint: room.name })}
      ${statCard({ label: '可用座位', value: enabled, unit: '个', iconName: 'check', tone: 'sage', hint: '可接受新预约' })}
      ${statCard({ label: '维修停用', value: maintenance, unit: '个', iconName: 'alert', tone: maintenance ? 'clay' : 'green', hint: '不参与预约' })}
      ${statCard({ label: '进行中预约', value: activeBookings.length, unit: '条', iconName: 'calendar', tone: 'gold', hint: '待签到与使用中' })}
    </div>
    <section class="panel">
      ${sectionTitle('座位管理', '座位编号在房间内唯一；维修停用不等同于删除', `
        <label class="inline-field"><span>选择房间</span><select data-bind="adminSeatRoomId" data-type="number" data-refresh="admin">${rooms.map((r) => `<option value="${r.id}" ${r.id === room.id ? 'selected' : ''}>${esc(r.name)}${r.enabled ? '' : '（停用）'}</option>`).join('')}</select></label>
        <button class="btn btn-ghost btn-sm" data-action="open-batch" data-id="${room.id}">${icon('grid', 15)} 批量生成</button>
        <button class="btn btn-primary btn-sm" data-action="open-seat" data-room="${room.id}">${icon('plus', 15)} 新增座位</button>
      `)}
      <div class="seat-manage-grid">
        ${seats.map((seat) => `<article class="manage-seat ${seat.enabled ? '' : 'is-off'}">
          <div class="manage-seat-head"><span class="seat-mini ${seat.enabled ? 'on' : 'off'}">${icon('chair', 18)}</span><strong>${esc(seat.code)}</strong><span class="status ${seat.enabled ? 'status-free' : 'status-disabled'}"><i></i>${seat.enabled ? '可用' : '维修'}</span></div>
          <p>${esc(seat.type)} · 第 ${seat.rowNo} 排第 ${seat.colNo} 列</p>
          <div class="manage-seat-actions">
            <button class="text-btn" data-action="open-seat" data-id="${seat.id}">编辑</button>
            <button class="text-btn" data-action="toggle-seat" data-id="${seat.id}">${seat.enabled ? '停用' : '启用'}</button>
            <button class="text-btn danger" data-action="delete-seat" data-id="${seat.id}">删除</button>
          </div>
        </article>`).join('')}
      </div>
      ${seats.length ? '' : emptyState({ iconName: 'chair', title: '该房间还没有座位', text: '可以新增单个座位或批量生成座位。' })}
    </section>`
}

export function renderAdminReservations(ctx) {
  const { state, now, ui } = ctx
  const date = ui.adminDate || todayOf(ctx)
  const roomId = Number(ui.adminRoomId) || 0
  const status = ui.adminStatus || 'ALL'
  const keyword = String(ui.adminKeyword || '').trim().toLowerCase()
  let rows = state.bookings.filter((b) =>
    (date === 'ALL' || b.date === date) &&
    (!roomId || b.roomId === roomId) &&
    (status === 'ALL' || b.status === status)
  ).map((b) => enrichBooking(state, b))
  if (keyword) {
    rows = rows.filter((b) => [b.studentName, b.studentNo, b.studentUsername, b.college, b.className, b.roomName, b.seatCode, b.code, b.operatorName].join(' ').toLowerCase().includes(keyword))
  }
  rows.sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  const total = rows.length
  rows = rows.slice(0, 150)
  const roomOptions = state.rooms.map((r) => `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')
  return `
    <div class="notice notice-info">${icon('user-plus', 19)}<div><strong>可代订、可取消，操作全程留痕</strong><p>管理员可为学生代订座位，并在详情中取消待签到或使用中的预约。学生敏感信息已按最小必要原则展示。</p></div><button class="btn btn-ghost btn-sm" data-action="nav" data-view="proxy">去代订</button></div>
    <section class="panel">
      ${sectionTitle('全部预约记录', '按日期、自习室、状态或学生检索；最多展示 150 条', '')}
      <div class="filter-row wrap">
        <label class="field compact"><span>预约日期</span><input type="date" data-bind="adminDate" data-refresh="admin" value="${date}"></label>
        <label class="field compact"><span>自习室</span><select data-bind="adminRoomId" data-type="number" data-refresh="admin"><option value="0">全部自习室</option>${roomOptions}</select></label>
        <label class="field compact"><span>状态</span><select data-bind="adminStatus" data-refresh="admin">
          ${['ALL', ...Object.keys(STATUS_LABELS)].map((s) => `<option value="${s}" ${status === s ? 'selected' : ''}>${s === 'ALL' ? '全部状态' : STATUS_LABELS[s]}</option>`).join('')}
        </select></label>
        <label class="field compact grow"><span>搜索</span><div class="search-box">${icon('search', 15)}<input data-bind="adminKeyword" data-refresh="admin" placeholder="姓名 / 学号 / 预约编号 / 座位" value="${esc(ui.adminKeyword || '')}"></div></label>
        <button class="btn btn-ghost btn-sm" data-action="clear-reservation-filters">清空筛选</button>
      </div>
      <div class="result-meta"><span>共 <strong>${total}</strong> 条记录</span><span>${date === 'ALL' ? '全部日期' : `${date} ${weekdayLabel(date)}`}${roomId ? ` · ${esc(state.rooms.find((r) => r.id === roomId)?.name || '')}` : ''}</span></div>
      ${rows.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>预约编号</th><th>学生</th><th>学院 / 班级</th><th>座位</th><th>日期与时段</th><th>状态</th><th>来源</th><th>签到时间</th><th class="align-right">操作</th></tr></thead>
        <tbody>${rows.map((b) => `<tr>
          <td><span class="mono">${esc(b.code)}</span></td>
          <td><div class="cell-main"><strong>${esc(b.studentName)}</strong><small>${esc(maskStudentNo(b.studentNo) || b.studentUsername)}</small></div></td>
          <td><div class="cell-main"><strong>${esc(b.college || '—')}</strong><small>${esc(b.className || '未分班')}</small></div></td>
          <td><div class="cell-main"><strong>${esc(b.roomName)} · ${esc(b.seatCode)}</strong><small>${esc(b.seatType)}</small></div></td>
          <td><div class="cell-main"><strong>${b.date} ${fmtRange(b.start, b.end)}</strong><small>${fmtDuration(b.duration)}</small></div></td>
          <td>${statusBadge(b.status, b.statusLabel)}${b.cancelReason ? `<small class="cell-hint">${esc(b.cancelReason)}</small>` : ''}</td>
          <td>${b.proxy ? `<span class="chip chip-gold">代订</span><small class="cell-hint">${esc(b.operatorName || '管理员')}</small>` : '<span class="chip chip-soft">自助</span>'}${b.note ? `<small class="cell-hint">${esc(b.note)}</small>` : ''}</td>
          <td>${b.checkedInAt ? b.checkedInAt.slice(11, 16) : '—'}</td>
          <td class="align-right"><div class="row-actions"><button class="btn btn-ghost btn-xs" data-action="view-booking" data-id="${b.id}">${icon('eye', 13)} 详情</button></div></td>
        </tr>`).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'search', title: '未查询到预约记录', text: '请调整日期、状态或关键词后重试。' })}
    </section>`
}

export function renderAdminViolations(ctx) {
  const { state, ui } = ctx
  const keyword = String(ui.violationKeyword || '').trim().toLowerCase()
  const active = state.blacklist.filter((b) => b.status === 'ACTIVE')
  const released = state.blacklist.filter((b) => b.status === 'RELEASED')
  const violations = state.violations
    .map((v) => {
      const booking = state.bookings.find((b) => b.id === v.bookingId)
      const user = state.users.find((u) => u.id === v.userId)
      const seat = booking ? state.seats.find((s) => s.id === booking.seatId) : null
      const room = booking ? state.rooms.find((r) => r.id === booking.roomId) : null
      return { ...v, user, booking, seat, room }
    })
    .filter((v) => !keyword || [v.user?.name, v.user?.studentNo, v.room?.name, v.seat?.code].join(' ').toLowerCase().includes(keyword))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return `
    <div class="stat-grid four">
      ${statCard({ label: '违约记录', value: state.violations.length, unit: '条', iconName: 'alert', tone: 'clay', hint: '累计超时未签到' })}
      ${statCard({ label: '当前黑名单', value: active.length, unit: '人', iconName: 'lock', tone: active.length ? 'danger' : 'green', hint: `阈值 ${state.config.violationThreshold} 次` })}
      ${statCard({ label: '历史解除', value: released.length, unit: '次', iconName: 'unlock', tone: 'sage', hint: '解除记录永久保留' })}
      ${statCard({ label: '今日失约', value: state.bookings.filter((b) => b.date === todayOf(ctx) && b.status === STATUS.MISSED).length, unit: '条', iconName: 'clock', hint: '系统自动判定', tone: 'gold' })}
    </div>

    <section class="panel">
      ${sectionTitle('黑名单处置', '系统按阈值自动加入；管理员只负责查询、核实与解除', `<div class="search-box">${icon('search', 15)}<input data-bind="violationKeyword" data-refresh="admin" placeholder="搜索姓名 / 学号 / 房间" value="${esc(ui.violationKeyword || '')}"></div>`)}
      ${active.length ? `<div class="blacklist-grid">${active.map((entry) => {
        const user = state.users.find((u) => u.id === entry.userId)
        const summary = violationSummary(state, entry.userId)
        return `<article class="blacklist-card">
          <div class="blacklist-head"><div class="person">${icon('user', 18)}<div><strong>${esc(user?.name || '学生')}</strong><small>${esc(maskStudentNo(user?.studentNo) || user?.username)} · ${esc(collegeShort(collegeOf(user)))} ${esc(user?.className || '')}</small></div></div><span class="status status-blacklist"><i></i>黑名单</span></div>
          <div class="blacklist-meta"><span>累计违约 <strong>${summary.count}</strong> 次</span><span>触发于 ${entry.triggeredAt.slice(0, 10)}</span></div>
          <p>${esc(entry.reason)}</p>
          <button class="btn btn-primary btn-sm" data-action="open-unblacklist" data-id="${entry.userId}">${icon('unlock', 14)} 解除黑名单</button>
        </article>`
      }).join('')}</div>` : `<div class="notice notice-success">${icon('shield', 19)}<div><strong>当前没有学生处于黑名单</strong><p>系统会在学生违约次数达到阈值时自动加入，并记录触发依据。</p></div></div>`}
    </section>

    <section class="panel">
      ${sectionTitle('学生违约记录', '只读数据，任何修改须留痕；违约记录是解除黑名单的审核依据', `<span class="chip chip-soft">${violations.length} 条</span>`)}
      ${violations.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>学生</th><th>违约时间</th><th>关联预约</th><th>违约类型</th><th>累计次数</th><th>黑名单状态</th></tr></thead>
        <tbody>${violations.map((v) => {
          const userSummary = violationSummary(state, v.userId)
          return `<tr>
            <td><div class="cell-main"><strong>${esc(v.user?.name || '—')}</strong><small>${esc(maskStudentNo(v.user?.studentNo) || v.user?.username || '')}</small><small>${esc(collegeShort(collegeOf(v.user)))} · ${esc(v.user?.className || '未分班')}</small></div></td>
            <td>${v.createdAt.slice(0, 16)}</td>
            <td><div class="cell-main"><strong>${esc(v.room?.name || '—')} · ${esc(v.seat?.code || '')}</strong><small>${v.booking ? `${v.booking.date} ${fmtRange(v.booking.start, v.booking.end)}` : '—'}</small></div></td>
            <td><span class="chip chip-clay">超时未签到</span></td>
            <td>${userSummary.count} / ${state.config.violationThreshold}</td>
            <td>${userSummary.active ? '<span class="status status-blacklist"><i></i>黑名单中</span>' : '<span class="status status-free"><i></i>正常</span>'}</td>
          </tr>`
        }).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'shield', title: '暂无违约记录', text: '学生按时签到，系统就不会生成违约记录。' })}
    </section>

    ${released.length ? `<section class="panel">
      ${sectionTitle('黑名单解除记录', '保留解除时间、操作人与解除依据', '')}
      <div class="timeline">${released.slice().reverse().map((entry) => {
        const user = state.users.find((u) => u.id === entry.userId)
        const operator = state.users.find((u) => u.id === entry.releasedBy)
        return `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${esc(user?.name || '学生')} · 已解除</strong><p>${esc(entry.releaseReason || '')}</p><small>${entry.releasedAt?.slice(0, 16)} · 操作人 ${esc(operator?.name || '管理员')}</small></div></div>`
      }).join('')}</div>
    </section>` : ''}`
}

export function renderAdminReports(ctx) {
  const { state, now, ui } = ctx
  const today = todayOf(ctx)
  const from = ui.reportFrom || addDays(today, -6)
  const to = ui.reportTo || today
  const rangeFrom = from > to ? to : from
  const rangeTo = from > to ? from : to
  const roomId = Number(ui.reportRoomId) || 0
  const stats = buildStats(state, { from: rangeFrom, to: rangeTo, roomId, now })
  const rows = stats.byDay
  const roomRows = stats.byRoom
  const hasData = stats.total > 0
  return `
    <section class="panel">
      ${sectionTitle('预约统计报表', '统一统计口径：按预约日期归属；座位利用率 = 有效预约时长 ÷ 座位开放时长', `<span class="chip chip-soft">${rangeFrom} 至 ${rangeTo}</span>`)}
      <div class="filter-row wrap">
        <label class="field compact"><span>开始日期</span><input type="date" data-bind="reportFrom" data-refresh="admin" value="${rangeFrom}" max="${today}"></label>
        <label class="field compact"><span>结束日期</span><input type="date" data-bind="reportTo" data-refresh="admin" value="${rangeTo}" max="${today}"></label>
        <label class="field compact"><span>自习室范围</span><select data-bind="reportRoomId" data-type="number" data-refresh="admin"><option value="0">全部自习室</option>${state.rooms.map((r) => `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>
        <div class="filter-spacer"></div>
        <button class="btn btn-ghost" data-action="export-reservations">${icon('download', 16)} 导出预约明细</button>
        <button class="btn btn-ghost" data-action="export-college" ${hasData ? '' : 'disabled'}>${icon('graduation', 16)} 导出学院统计</button>
        <button class="btn btn-primary" data-action="export-report" ${hasData ? '' : 'disabled'}>${icon('file', 16)} 导出统计报表</button>
      </div>
      <div class="quick-ranges">
        <span>快捷范围：</span>
        ${[7, 14, 30].map((n) => { const f = addDays(today, -(n - 1)); return `<button class="text-btn ${rangeFrom === f && rangeTo === today ? 'active' : ''}" data-action="set-report-range" data-days="${n}">近 ${n} 天</button>` }).join('')}
      </div>
    </section>

    ${hasData ? `
    <div class="stat-grid four">
      ${statCard({ label: '预约总量', value: stats.total, unit: '条', iconName: 'calendar', hint: `${stats.range.days} 天 · ${stats.byRoom.filter((r) => r.total).length} 间自习室` })}
      ${statCard({ label: '签到率', value: pct(stats.checkinRate), iconName: 'check', tone: 'sage', hint: `签到 ${stats.attended} 条` })}
      ${statCard({ label: '违约量', value: stats.missed, unit: '条', iconName: 'alert', tone: stats.missed ? 'clay' : 'green', hint: `违约率 ${pct(stats.violationRate)}` })}
      ${statCard({ label: '座位利用率', value: pct(stats.utilization), iconName: 'chart', tone: 'gold', hint: `有效预约 ${stats.bookedHours.toFixed(0)} 座位·小时` })}
    </div>
    <section class="panel">
      ${sectionTitle('按日统计', '点击导出可下载完整 CSV（含按房间明细）', '')}
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>日期</th><th>预约量</th><th>签到量</th><th>违约量</th><th>取消量</th><th>座位利用率</th></tr></thead>
        <tbody>${rows.map((row) => `<tr>
          <td><strong>${row.date}</strong> <small class="muted">${row.weekday}</small></td>
          <td>${row.total}</td><td>${row.attended}</td><td>${row.missed}</td><td>${row.cancelled}</td>
          <td><div class="util-cell"><div class="progress"><span style="width:${row.utilization * 100}%"></span></div><small>${pct(row.utilization)}</small></div></td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>
    <section class="panel">
      ${sectionTitle('按学院统计', '学院口径 = 预约学生所属学院；可导出学院/班级维度 CSV', `<button class="btn btn-ghost btn-sm" data-action="export-class">${icon('graduation', 15)} 导出班级明细</button>`)}
      ${stats.byCollege.length ? `<div class="college-grid">${stats.byCollege.map((c) => `<article class="college-card">
        <div class="college-card-head"><strong>${esc(c.short)} · ${esc(c.college)}</strong><span class="chip chip-soft">${c.students} 人</span></div>
        <div class="college-figures"><span><small>预约</small><strong>${c.total}</strong></span><span><small>签到率</small><strong>${pct(c.checkinRate)}</strong></span><span><small>违约</small><strong>${c.missed}</strong></span><span><small>利用率</small><strong>${pct(c.utilization)}</strong></span></div>
        <div class="progress"><span style="width:${Math.min(100, c.utilization * 100)}%"></span></div>
        <small class="muted">占全部预约 ${pct(c.share)}</small>
      </article>`).join('')}</div>` : '<p class="muted">所选范围暂无学院数据。</p>'}
    </section>
    <section class="panel">
      ${sectionTitle('按自习室统计', '便于比较不同空间的资源使用情况', '')}
      <div class="room-compare">${roomRows.map((room) => `<div class="compare-row">
        <span class="compare-name">${esc(room.name)}</span>
        <div class="progress"><span style="width:${room.utilization * 100}%"></span></div>
        <span class="compare-value">${pct(room.utilization)}</span>
        <span class="compare-meta">${room.total} 条 · 违约 ${room.missed}</span>
      </div>`).join('')}</div>
    </section>` : emptyState({ iconName: 'chart', title: '所选范围暂无统计数据', text: '请调整日期或自习室范围后重试。', action: `<button class="btn btn-ghost" data-action="set-report-range" data-days="30">查看近 30 天</button>` })}
  `
}

export function renderAdminSeatReport(ctx) {
  return renderAdminReports(ctx)
}
