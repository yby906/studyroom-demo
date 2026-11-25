import { createStore } from './core/store.js'
import { DEMO_PASSWORD } from './core/seed.js'
import {
  ROLES, ROLE_KEYS, ACTION_LABELS, AUTH_MODE_LABELS, RuleError, activeBlacklist, advanceDemoTime, audit,
  batchSeats, bookingById, bookingDeadlineMs, bookingStartMs, buildReportRows, buildStats, cancelBooking, checkIn,
  checkOut, clockNow, createBooking, createUser, csvText, deleteRoom, deleteSeat, enrichBooking,
  login, logout, maskStudentNo, registerUser, resolveAuthException, roomById, roomLocation, roomSeatCount, saveConfig, saveRoom,
  saveSeat, seatById, sessionUser, setDemoTime, setSeatEnabled, simulateAuthSync, sweep,
  toggleRoom, touchSession, unblacklist, unlockUser, updateUser, userByName, userById
} from './core/rules.js'
import { addDays, addMonths, fmtDuration, fmtRange, localDate, monthKeyOf, parseLocal, toLocal, todayKey } from './core/time.js'
import { backupJson, backupSummary, parseBackup } from './core/backup.js'
import { loginPage } from './ui/login.js'
import { renderStudentCalendar, renderStudentGuide, renderStudentMine, renderStudentSeats, renderStudentViolations } from './ui/student.js'
import { renderAdminDashboard, renderAdminReports, renderAdminReservations, renderAdminRooms, renderAdminSeats, renderAdminViolations } from './ui/roomAdmin.js'
import { renderAnalytics } from './ui/analytics.js'
import { renderSysAccounts, renderSysAuth, renderSysConfig, renderSysDashboard, renderSysLogs } from './ui/sysAdmin.js'
import { avatar, esc, icon, logoMark, qrSvg, roleBadge, statusBadge } from './ui/components.js'

const app = document.getElementById('app')
const toastRoot = document.getElementById('toasts')
const modalRoot = document.getElementById('modal-root')
const store = createStore()
let state = store.load()
let ctx = {
  state,
  user: null,
  now: clockNow(state),
  view: '',
  ui: {},
  modal: null,
  pendingImport: null
}

const ROLE_VIEWS = {
  STUDENT: ['seats', 'mine', 'calendar', 'violations', 'guide'],
  ROOM_ADMIN: ['dashboard', 'rooms', 'seats', 'reservations', 'violations', 'reports'],
  LIB_ADMIN: ['analytics'],
  SYS_ADMIN: ['dashboard', 'accounts', 'logs', 'auth', 'config']
}

const NAV_ITEMS = {
  STUDENT: [
    { view: 'seats', label: '预约座位', icon: 'grid' },
    { view: 'mine', label: '我的预约', icon: 'list', badge: 'active' },
    { view: 'calendar', label: '预约日历', icon: 'calendar' },
    { view: 'violations', label: '违约与信用', icon: 'shield' },
    { view: 'guide', label: '使用指南', icon: 'book' }
  ],
  ROOM_ADMIN: [
    { view: 'dashboard', label: '管理概览', icon: 'grid' },
    { view: 'rooms', label: '房间管理', icon: 'building' },
    { view: 'seats', label: '座位管理', icon: 'chair' },
    { view: 'reservations', label: '预约记录', icon: 'calendar' },
    { view: 'violations', label: '违约与黑名单', icon: 'shield', badge: 'blacklist' },
    { view: 'reports', label: '统计报表', icon: 'file' }
  ],
  LIB_ADMIN: [
    { view: 'analytics', label: '使用分析', icon: 'chart' }
  ],
  SYS_ADMIN: [
    { view: 'dashboard', label: '系统概览', icon: 'grid' },
    { view: 'accounts', label: '账号权限', icon: 'users', badge: 'locked' },
    { view: 'logs', label: '操作日志', icon: 'list' },
    { view: 'auth', label: '统一认证', icon: 'sync' },
    { view: 'config', label: '系统配置', icon: 'settings' }
  ]
}

const VIEW_META = {
  seats: { student: { eyebrow: 'FIND YOUR FOCUS', title: '预约座位', desc: '选择日期、时段与座位，为下一次专注留一个位置。' }, admin: { eyebrow: 'SEAT MANAGEMENT', title: '座位管理', desc: '维护座位编号、类型与可用状态，让每张书桌都清晰可查。' } },
  mine: { eyebrow: 'YOUR RESERVATIONS', title: '我的预约', desc: '每一次预约，都是向目标靠近的一步。' },
  calendar: { eyebrow: 'YOUR STUDY CALENDAR', title: '预约日历', desc: '按月查看自己的自习安排，提前规划每一段专注时光。' },
  violations: { student: { eyebrow: 'CREDIT & RULES', title: '违约与信用', desc: '按时签到，及时取消，让座位资源被认真使用。' }, admin: { eyebrow: 'VIOLATION CONTROL', title: '违约与黑名单', desc: '查询违约记录，核实并解除黑名单，保障预约公平。' } },
  guide: { eyebrow: 'A BETTER STUDY', title: '使用指南', desc: '了解预约、签到、签退与违约规则，轻松开启自习。' },
  dashboard: { admin: { eyebrow: 'SPACE OVERVIEW', title: '管理概览', desc: '掌握今日预约与座位运行状态，让每个座位发挥价值。' }, sys: { eyebrow: 'SYSTEM OVERVIEW', title: '系统概览', desc: '查看账号、任务、日志与配置，保障系统稳定运行。' } },
  rooms: { eyebrow: 'ROOM MANAGEMENT', title: '房间管理', desc: '维护自习室基础信息与开放状态。' },
  reservations: { eyebrow: 'RESERVATION QUERY', title: '预约记录', desc: '按条件检索全校预约记录，只读查询、全程留痕。' },
  reports: { eyebrow: 'STATISTICS & EXPORT', title: '统计报表', desc: '按统一口径统计预约、签到、违约与座位利用率。' },
  analytics: { eyebrow: 'DATA & INSIGHT', title: '使用分析', desc: '从聚合数据中发现高峰与闲置，为资源调配提供依据。' },
  accounts: { eyebrow: 'ACCOUNTS & ROLES', title: '账号权限', desc: '分配角色权限、启停账号并处理登录锁定。' },
  logs: { eyebrow: 'AUDIT TRAIL', title: '操作日志', desc: '所有关键操作全程留痕，支持筛选与导出审计。' },
  auth: { eyebrow: 'IDENTITY SYNC', title: '统一认证', desc: '对接校园统一身份认证，同步师生身份与账号状态。' },
  config: { eyebrow: 'SYSTEM CONFIG', title: '系统配置', desc: '调整预约规则、违约阈值与安全策略。' }
}

function metaFor(view) {
  const entry = VIEW_META[view]
  if (!entry) return { eyebrow: '', title: view, desc: '' }
  if (entry.student && entry.admin) return ctx.user?.role === 'STUDENT' ? entry.student : entry.admin
  if (entry.admin && entry.sys) return ctx.user?.role === 'SYS_ADMIN' ? entry.sys : entry.admin
  return entry
}

function initUi() {
  const today = localDate(ctx.now)
  const firstRoom = state.rooms.find((r) => r.enabled) || state.rooms[0]
  ctx.ui = {
    date: today,
    roomId: firstRoom?.id || 0,
    start: '',
    end: '',
    seatId: null,
    mineStatus: 'ALL',
    mineKeyword: '',
    calendarMonth: monthKeyOf(ctx.now),
    calendarDate: localDate(ctx.now),
    adminSeatRoomId: firstRoom?.id || 0,
    adminDate: today,
    adminRoomId: 0,
    adminStatus: 'ALL',
    adminKeyword: '',
    violationKeyword: '',
    reportFrom: addDays(today, -6),
    reportTo: today,
    reportRoomId: 0,
    accountKeyword: '',
    accountRole: 'ALL',
    logAction: 'ALL',
    logResult: 'ALL',
    logKeyword: '',
    logPage: 1,
    analyticsDays: 7,
    analyticsRoomId: 0
  }
}

function persist() {
  try {
    store.save()
  } catch (error) {
    toast(error.message, 'error')
  }
}

function toast(message, type = 'success') {
  const node = document.createElement('div')
  node.className = `toast toast-${type}`
  node.innerHTML = `<span class="toast-icon">${icon(type === 'error' ? 'alert' : type === 'warning' ? 'clock' : 'check', 17)}</span><span>${esc(message)}</span><button aria-label="关闭">×</button>`
  node.querySelector('button').addEventListener('click', () => node.remove())
  toastRoot.appendChild(node)
  setTimeout(() => {
    node.classList.add('leaving')
    setTimeout(() => node.remove(), 320)
  }, type === 'error' ? 5200 : 3600)
}

function navBadge(kind) {
  if (kind === 'active') return state.bookings.filter((b) => b.userId === ctx.user.id && ['WAITING', 'CHECKED_IN'].includes(b.status)).length
  if (kind === 'blacklist') return state.blacklist.filter((b) => b.status === 'ACTIVE').length
  if (kind === 'locked') return Object.values(state.loginAttempts).filter((a) => a.lockedUntil > Date.now()).length
  return 0
}

function renderLogin(message = '') {
  ctx.user = null
  document.title = '登录 · 静园自习空间'
  app.innerHTML = loginPage(ctx)
  if (message) {
    const box = app.querySelector('[data-login-error]')
    if (box) {
      box.hidden = false
      box.textContent = message
    }
  }
}

function shellHtml() {
  const role = ctx.user.role
  const items = NAV_ITEMS[role] || []
  const meta = metaFor(ctx.view)
  const navCount = (item) => (item.badge ? navBadge(item.badge) : 0)
  const tip = role === 'STUDENT'
    ? { title: '把时间留给专注', text: '提前规划，按时签到，<br>让每一张书桌都被善用。' }
    : role === 'SYS_ADMIN'
      ? { title: '稳定运行，透明可审计', text: '权限最小化，操作留痕迹，<br>让系统长期可靠地服务师生。' }
      : role === 'LIB_ADMIN'
        ? { title: '用数据看见资源', text: '关注高峰与闲置，<br>让有限空间服务更多学生。' }
        : { title: '让空间井然有序', text: '维护房间与座位，<br>及时处理违约与异常。' }
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="brand">${logoMark(38)}<span>静园<small>CAMPUS STUDY ROOM</small></span></div>
      <div class="nav-label">${role === 'STUDENT' ? '我的学习空间' : role === 'LIB_ADMIN' ? '决策分析' : role === 'SYS_ADMIN' ? '系统运维' : '自习室管理'}</div>
      <nav class="side-nav">
        ${items.map((item) => {
          const count = navCount(item)
          return `<button class="nav-item ${ctx.view === item.view ? 'active' : ''}" data-action="nav" data-view="${item.view}">
            ${icon(item.icon, 19)}<span>${item.label}</span>${count ? `<em>${count}</em>` : ''}
          </button>`
        }).join('')}
      </nav>
      <div class="side-utility">
        <div class="nav-label">数据工具</div>
        <button class="nav-item" data-action="open-backup" title="导出或导入本地数据备份">${icon('download', 19)}<span>数据备份</span></button>
      </div>
      <div class="sidebar-tip"><span class="tip-mark">${icon('spark', 16)}</span><h4>${tip.title}</h4><p>${tip.text}</p></div>
      <div class="sidebar-user">
        ${avatar(ctx.user.name, role)}
        <div><strong>${esc(ctx.user.name)}</strong><small>${ROLES[role]?.label || role}</small></div>
        <button class="icon-btn ghost" data-action="logout" title="退出登录" aria-label="退出登录">${icon('logout', 18)}</button>
      </div>
    </aside>
    <div class="nav-scrim" data-action="toggle-menu"></div>
    <div class="main-shell">
      <header class="topbar">
        <button class="icon-btn menu-btn" data-action="toggle-menu" aria-label="打开菜单">${icon('menu', 20)}</button>
        <div class="crumb"><span>${ROLES[role]?.label || ''}</span>${icon('chevron', 13)}<strong>${meta.title}</strong></div>
        <div class="top-actions">
          <button class="demo-pill" data-action="open-demo-clock" title="调整演示时间">
            <span class="live-dot"></span><span data-live-clock>${toLocal(ctx.now)}</span><em>演示时间</em>
          </button>
          <button class="icon-btn" data-action="refresh" title="刷新数据" aria-label="刷新">${icon('refresh', 18)}</button>
          <span class="top-role">${roleBadge(role)}</span>
        </div>
      </header>
      <main class="main-content">
        <div class="page-heading">
          <div><span class="eyebrow green">${meta.eyebrow}</span><h1>${meta.title}<i>.</i></h1><p>${meta.desc}</p></div>
          <div class="heading-side"><span class="chip chip-soft">${icon('pin', 13)} 本地数据 · 无需数据库</span></div>
        </div>
        <div id="view-root"></div>
        <footer class="app-footer"><span>静园 · 校园自习室预约管理系统</span><span>本地纯前端演示 · 数据保存在当前浏览器</span></footer>
      </main>
    </div>
  </div>`
}

function renderViewContent() {
  const role = ctx.user.role
  switch (ctx.view) {
    case 'seats': return role === 'STUDENT' ? renderStudentSeats(ctx) : renderAdminSeats(ctx)
    case 'mine': return renderStudentMine(ctx)
    case 'calendar': return renderStudentCalendar(ctx)
    case 'violations': return role === 'STUDENT' ? renderStudentViolations(ctx) : renderAdminViolations(ctx)
    case 'guide': return renderStudentGuide(ctx)
    case 'dashboard': return role === 'SYS_ADMIN' ? renderSysDashboard(ctx) : renderAdminDashboard(ctx)
    case 'rooms': return renderAdminRooms(ctx)
    case 'reservations': return renderAdminReservations(ctx)
    case 'reports': return renderAdminReports(ctx)
    case 'analytics': return renderAnalytics(ctx)
    case 'accounts': return renderSysAccounts(ctx)
    case 'logs': return renderSysLogs(ctx)
    case 'auth': return renderSysAuth(ctx)
    case 'config': return renderSysConfig(ctx)
    default: return ''
  }
}

function renderApp(options = {}) {
  if (!ctx.user) {
    renderLogin()
    return
  }
  const meta = metaFor(ctx.view)
  document.title = `${meta.title} · 静园自习空间`
  const scrollY = window.scrollY
  app.innerHTML = shellHtml()
  const root = document.getElementById('view-root')
  if (root) root.innerHTML = renderViewContent()
  updateClock()
  if (options.focus) {
    const el = app.querySelector(`[data-bind="${options.focus}"]`)
    if (el) {
      el.focus({ preventScroll: true })
      if (el.setSelectionRange && el.type === 'text') {
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    }
  } else {
    window.scrollTo({ top: scrollY })
  }
}

function updateClock() {
  const text = toLocal(ctx.now)
  document.querySelectorAll('[data-live-clock]').forEach((el) => { el.textContent = text })
}

function navigate(view, updateHash = true) {
  if (!ctx.user) return
  const allowed = ROLE_VIEWS[ctx.user.role] || []
  if (!allowed.includes(view)) view = ROLES[ctx.user.role].home
  const changed = view !== ctx.view
  ctx.view = view
  touchSession(state, Date.now())
  if (changed && ctx.user.role !== 'STUDENT' && ['reservations', 'violations', 'reports', 'accounts', 'logs', 'analytics'].includes(view)) {
    audit(state, ctx.user, 'QUERY', `查看${metaFor(view).title}`, ctx.now)
    persist()
  }
  if (updateHash) {
    const hash = `#/${view}`
    if (location.hash !== hash) history.replaceState(null, '', hash)
  }
  renderApp()
}

function currentHome() {
  return ROLES[ctx.user.role].home
}

function openModal(modal) {
  ctx.modal = modal
  modalRoot.innerHTML = renderModal()
  document.body.classList.add('modal-open')
  const first = modalRoot.querySelector('input:not([type="hidden"]), select, textarea') ||
    modalRoot.querySelector('.modal-actions button, .modal button')
  if (first) setTimeout(() => first.focus(), 20)
}

function closeModal() {
  ctx.modal = null
  modalRoot.innerHTML = ''
  document.body.classList.remove('modal-open')
}

function fieldValue(name, fallback = '') {
  return ctx.modal?.[name] ?? fallback
}

function renderModal() {
  const m = ctx.modal
  if (!m) return ''
  let inner = ''
  if (m.type === 'book') {
    const seat = seatById(state, m.seatId)
    const room = roomById(state, seat?.roomId)
    const duration = m.start && m.end ? parseLocal(`${m.date}T${m.end}`) - parseLocal(`${m.date}T${m.start}`) : 0
    inner = `
      <span class="modal-icon">${icon('calendar', 24)}</span>
      <h2>确认预约</h2>
      <p class="modal-sub">请确认座位与时段，预约成功后需在签到窗口内签到。</p>
      <div class="booking-summary">
        <div class="summary-main"><strong>${esc(room?.name || '')} · ${esc(seat?.code || '')}</strong><span>${esc(seat?.type || '')} · ${esc(roomLocation(room))}</span></div>
        <dl><div><dt>日期</dt><dd>${m.date}</dd></div><div><dt>时段</dt><dd>${fmtRange(m.start, m.end)}</dd></div><div><dt>时长</dt><dd>${fmtDuration(Math.round(duration / 60000))}</dd></div><div><dt>签到窗口</dt><dd>开始后 ${state.config.checkinWindow} 分钟内</dd></div></dl>
      </div>
      <p class="modal-note">${icon('info', 14)} 同一时段每人仅保留一个有效预约；未按时签到将计入违约。</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">再想想</button><button class="btn btn-primary" data-action="confirm-book">确认预约 ${icon('arrow', 16)}</button></div>`
  } else if (m.type === 'cancel') {
    const booking = enrichBooking(state, bookingById(state, m.id))
    inner = `
      <span class="modal-icon warn">${icon('calendar', 24)}</span>
      <h2>取消这次预约？</h2>
      <p class="modal-sub">${esc(booking?.roomName || '')} · ${esc(booking?.seatCode || '')}<br>${booking?.date || ''} ${fmtRange(booking?.start, booking?.end)}</p>
      <form data-form="cancel">
        <label class="field"><span>取消原因（选填）</span><textarea name="reason" rows="3" maxlength="200" placeholder="例如：课程调整、临时有事"></textarea></label>
        <p class="modal-note">${icon('info', 14)} 取消后座位立即释放，可以重新选择其他座位。进入签到时段后不可取消。</p>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">保留预约</button><button class="btn btn-danger" type="submit">确认取消</button></div>
      </form>`
  } else if (m.type === 'demo') {
    inner = `
      <span class="modal-icon">${icon('clock', 24)}</span>
      <h2>调整演示时间</h2>
      <p class="modal-sub">使用北京时间模拟业务流程。时间只向前推进；已失约或已完成的预约不会恢复。</p>
      <form data-form="demo-time">
        <label class="field"><span>演示日期与时间</span><input type="datetime-local" name="time" value="${toLocal(ctx.now).replace(' ', 'T')}" required></label>
        <div class="quick-advance">
          <span>快速推进</span>
          <button type="button" class="btn btn-ghost btn-sm" data-action="advance-demo" data-minutes="15">+15 分钟</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="advance-demo" data-minutes="60">+1 小时</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="advance-demo" data-minutes="180">+3 小时</button>
        </div>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="open-reset">重置演示数据</button><button class="btn btn-primary" type="submit">应用演示时间</button></div>
      </form>`
  } else if (m.type === 'reset') {
    inner = `
      <span class="modal-icon danger">${icon('refresh', 24)}</span>
      <h2>重置演示数据？</h2>
      <p class="modal-sub">将清除当前浏览器中的全部操作数据，重新生成自习室、座位、历史预约与违约记录，并回到当前时刻。当前登录身份会退出。</p>
      <p class="modal-note">${icon('alert', 14)} 此操作不可撤销；其他浏览器或设备的数据不受影响。</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn btn-danger" data-action="modal-confirm">确认重置</button></div>`
  } else if (m.type === 'room') {
    const room = m.id ? roomById(state, m.id) : null
    inner = `
      <span class="modal-icon">${icon('building', 24)}</span>
      <h2>${room ? '编辑自习室' : '新增自习室'}</h2>
      <p class="modal-sub">${room ? '修改基础信息不会改变已产生的预约。' : '创建后会自动按行列生成座位，可在座位管理中继续调整。'}</p>
      <form data-form="room">
        <input type="hidden" name="id" value="${room?.id || ''}">
        <div class="form-grid two">
          <label class="field"><span>自习室名称 *</span><input name="name" required maxlength="40" value="${esc(room?.name || '')}" placeholder="例如：静思自习室"></label>
          <label class="field"><span>校区 *</span><input name="campus" required maxlength="20" value="${esc(room?.campus || '主校区')}"></label>
          <label class="field"><span>楼栋 *</span><input name="building" required maxlength="30" value="${esc(room?.building || '')}" placeholder="例如：图书馆"></label>
          <label class="field"><span>楼层 *</span><input name="floor" type="number" min="1" max="30" required value="${room?.floor || 2}"></label>
          <label class="field"><span>开放时间 *</span><input name="openTime" type="time" required value="${room?.openTime || state.config.openTime}"></label>
          <label class="field"><span>闭馆时间 *</span><input name="closeTime" type="time" required value="${room?.closeTime || state.config.closeTime}"></label>
        </div>
        <label class="field"><span>房间说明</span><textarea name="description" rows="2" maxlength="200" placeholder="例如：临窗自然光，适合长时间阅读">${esc(room?.description || '')}</textarea></label>
        ${room ? '' : `<div class="form-grid three">
          <label class="field"><span>座位行数</span><input name="rows" type="number" min="1" max="12" value="4" required></label>
          <label class="field"><span>每行座位</span><input name="columns" type="number" min="1" max="12" value="6" required></label>
          <label class="field"><span>编号前缀</span><input name="prefix" maxlength="2" value="" placeholder="自动"></label>
        </div>`}
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">${room ? '保存修改' : '创建自习室'}</button></div>
      </form>`
  } else if (m.type === 'seat') {
    const seat = m.id ? seatById(state, m.id) : null
    const room = roomById(state, seat?.roomId || m.roomId)
    inner = `
      <span class="modal-icon">${icon('chair', 24)}</span>
      <h2>${seat ? '编辑座位' : '新增座位'}</h2>
      <p class="modal-sub">${esc(room?.name || '')} · 座位编号在房间内唯一。</p>
      <form data-form="seat">
        <input type="hidden" name="id" value="${seat?.id || ''}">
        <input type="hidden" name="roomId" value="${room?.id || ''}">
        <div class="form-grid two">
          <label class="field"><span>座位编号 *</span><input name="code" required maxlength="10" value="${esc(seat?.code || '')}" placeholder="例如：A33"></label>
          <label class="field"><span>座位类型</span><select name="type">${['标准', '靠窗', '插座', '无障碍'].map((t) => `<option value="${t}" ${seat?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>可用状态</span><select name="enabled"><option value="true" ${!seat || seat.enabled ? 'selected' : ''}>启用</option><option value="false" ${seat && !seat.enabled ? 'selected' : ''}>维修停用</option></select></label>
        <p class="modal-note">${icon('info', 14)} 维修停用不等同于删除；已有预约仍按原规则处理。</p>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">保存座位</button></div>
      </form>`
  } else if (m.type === 'batch') {
    const room = roomById(state, m.roomId)
    inner = `
      <span class="modal-icon">${icon('grid', 24)}</span>
      <h2>批量生成座位</h2>
      <p class="modal-sub">${esc(room?.name || '')} · 新座位将追加到现有座位之后。</p>
      <form data-form="batch">
        <input type="hidden" name="roomId" value="${room?.id || ''}">
        <div class="form-grid three">
          <label class="field"><span>新增行数</span><input name="rows" type="number" min="1" max="12" value="2" required></label>
          <label class="field"><span>每行座位</span><input name="columns" type="number" min="1" max="12" value="6" required></label>
          <label class="field"><span>编号前缀</span><input name="prefix" maxlength="2" value="" placeholder="S"></label>
        </div>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">生成座位</button></div>
      </form>`
  } else if (m.type === 'unblacklist') {
    const user = userById(state, m.userId)
    const summary = state.violations.filter((v) => v.userId === m.userId)
    inner = `
      <span class="modal-icon warn">${icon('unlock', 24)}</span>
      <h2>解除黑名单</h2>
      <p class="modal-sub">${esc(user?.name || '')} · ${esc(maskStudentNo(user?.studentNo) || user?.username || '')}，累计违约 ${summary.length} 次，已达到阈值。解除后将恢复预约权限，历史记录保留。</p>
      <form data-form="unblacklist">
        <input type="hidden" name="userId" value="${m.userId}">
        <label class="field"><span>解除原因与依据 *</span><textarea name="reason" rows="4" required minlength="2" maxlength="200" placeholder="例如：学生已提交情况说明，经核实当日因突发疾病未能签到，同意解除"></textarea></label>
        <p class="modal-note">${icon('info', 14)} 解除操作将记录操作人、时间与原因，便于审计。</p>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">确认解除</button></div>
      </form>`
  } else if (m.type === 'user') {
    const user = m.id ? userById(state, m.id) : null
    inner = `
      <span class="modal-icon">${icon('user', 24)}</span>
      <h2>${user ? '编辑账号权限' : '创建账号'}</h2>
      <p class="modal-sub">${user ? '调整角色或启停账号；最高权限账号不可修改或停用。' : '演示环境统一初始密码为 ' + DEMO_PASSWORD + '，不接入真实认证。'}</p>
      <form data-form="user">
        <input type="hidden" name="id" value="${user?.id || ''}">
        <div class="form-grid two">
          <label class="field"><span>姓名 *</span><input name="name" required maxlength="20" value="${esc(user?.name || '')}"></label>
          <label class="field"><span>登录账号 *</span><input name="username" required maxlength="20" value="${esc(user?.username || '')}" ${user ? 'readonly' : ''} placeholder="字母、数字或下划线"></label>
          <label class="field"><span>角色 *</span><select name="role">${ROLE_KEYS.map((role) => `<option value="${role}" ${user?.role === role ? 'selected' : ''}>${ROLES[role].label}</option>`).join('')}</select></label>
          ${user ? `<label class="field"><span>账号状态</span><select name="enabled"><option value="true" ${user.enabled ? 'selected' : ''}>启用</option><option value="false" ${!user.enabled ? 'selected' : ''}>停用</option></select></label>` : ''}
          <label class="field"><span>学号 / 工号</span><input name="studentNo" maxlength="20" value="${esc(user?.studentNo || '')}"></label>
          <label class="field"><span>院系 / 部门</span><input name="dept" maxlength="40" value="${esc(user?.dept || '')}"></label>
        </div>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">${user ? '保存变更' : '创建账号'}</button></div>
      </form>`
  } else if (m.type === 'booking') {
    const b = enrichBooking(state, bookingById(state, m.id))
    inner = `
      <span class="modal-icon">${icon('calendar', 24)}</span>
      <h2>预约详情</h2>
      <p class="modal-sub">${esc(b?.code || '')} · 只读记录</p>
      <dl class="detail-list modal-detail">
        <div><dt>学生</dt><dd>${esc(b?.studentName || '—')} · ${esc(maskStudentNo(b?.studentNo) || b?.studentUsername || '')}</dd></div>
        <div><dt>自习室</dt><dd>${esc(b?.roomName || '—')} · ${esc(b?.seatCode || '')}（${esc(b?.seatType || '')}）</dd></div>
        <div><dt>日期与时段</dt><dd>${b?.date || ''} ${fmtRange(b?.start, b?.end)}</dd></div>
        <div><dt>状态</dt><dd>${esc(b?.statusLabel || '—')}</dd></div>
        <div><dt>创建时间</dt><dd>${b?.createdAt?.slice(0, 16) || '—'}</dd></div>
        <div><dt>签到截止</dt><dd>${b?.checkinDeadline?.slice(0, 16) || '—'}</dd></div>
        <div><dt>签到时间</dt><dd>${b?.checkedInAt?.slice(0, 16) || '—'}</dd></div>
        <div><dt>结束时间</dt><dd>${b?.endedAt?.slice(0, 16) || '—'}</dd></div>
        ${b?.cancelReason ? `<div><dt>取消原因</dt><dd>${esc(b.cancelReason)}</dd></div>` : ''}
      </dl>
      <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">关闭</button></div>`
  } else if (m.type === 'register') {
    inner = `
      <span class="modal-icon">${icon('user', 24)}</span>
      <h2>注册新用户</h2>
      <p class="modal-sub">创建一个学生账号，注册信息保存在当前浏览器。登录名注册后不可修改。</p>
      <form data-form="register">
        <div class="form-grid two">
          <label class="field"><span>姓名 *</span><input name="name" required minlength="2" maxlength="20" placeholder="请输入真实姓名"></label>
          <label class="field"><span>登录名 *</span><input name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="username" placeholder="字母、数字或下划线"></label>
        </div>
        <div class="form-grid two">
          <label class="field"><span>密码 *</span><input name="password" type="password" required minlength="6" maxlength="40" autocomplete="new-password" placeholder="至少 6 位字符"></label>
          <label class="field"><span>确认密码 *</span><input name="confirmPassword" type="password" required minlength="6" maxlength="40" autocomplete="new-password" placeholder="再次输入密码"></label>
        </div>
        <div class="form-grid two">
          <label class="field"><span>学号</span><input name="studentNo" maxlength="20" placeholder="选填"></label>
          <label class="field"><span>院系</span><input name="dept" maxlength="40" placeholder="选填"></label>
        </div>
        <p class="modal-note">${icon('info', 14)} 注册账号默认为学生角色，登录名和密码仅保存在本机浏览器，请勿使用真实校园统一认证密码。</p>
        <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">创建账号并登录</button></div>
      </form>`
  } else if (m.type === 'auth-exception') {
    const exception = (state.authSync.exceptions || []).find((item) => item.username === m.username)
    if (!exception) {
      inner = `
        <span class="modal-icon">${icon('check', 24)}</span>
        <h2>该异常已处理</h2>
        <p class="modal-sub">这条异常已经不在待处理清单中，请关闭窗口后重新同步查看最新状态。</p>
        <div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">关闭</button></div>`
    } else {
      const students = state.users.filter((u) => u.role === 'STUDENT')
      const mode = m.mode || 'create'
      const defaultUserId = m.userId || students[0]?.id || ''
      inner = `
        <span class="modal-icon warn">${icon('shield', 24)}</span>
        <h2>处理认证异常</h2>
        <p class="modal-sub">核对统一认证平台与本系统账号后选择处理方式。处理结果会写入操作日志。</p>
        <div class="exception-summary">
          <div><span>学号 / 登录名</span><strong>${esc(exception.username)}</strong></div>
          <div><span>认证平台姓名</span><strong>${esc(exception.name || '—')}</strong></div>
          <div><span>院系</span><strong>${esc(exception.dept || '—')}</strong></div>
          <div><span>异常原因</span><strong>${esc(exception.message)}</strong></div>
        </div>
        <form data-form="auth-exception" class="auth-exception-form" data-mode="${esc(mode)}">
          <input type="hidden" name="username" value="${esc(exception.username)}">
          <label class="field"><span>处理方式 *</span>
            <select name="mode" data-auth-mode>
              <option value="create" ${mode === 'create' ? 'selected' : ''}>创建新学生账号并绑定学号</option>
              <option value="bind" ${mode === 'bind' ? 'selected' : ''}>绑定已有本地账号</option>
              <option value="ignore" ${mode === 'ignore' ? 'selected' : ''}>仅标记已处理，暂不建号</option>
            </select>
          </label>
          <div class="auth-mode-fields create-only">
            <div class="form-grid two">
              <label class="field"><span>姓名（按认证平台）</span><input name="name" maxlength="20" value="${esc(exception.name || '')}"></label>
              <label class="field"><span>院系</span><input name="dept" maxlength="40" value="${esc(exception.dept || '')}"></label>
            </div>
            <p class="modal-note">${icon('info', 14)} 将创建学生账号，登录名为 ${esc(exception.username)}，初始密码为 ${DEMO_PASSWORD}。</p>
          </div>
          <div class="auth-mode-fields bind-only">
            <label class="field"><span>选择要绑定的学生账号</span>
              <select name="userId">
                ${students.map((u) => `<option value="${u.id}" ${String(u.id) === String(defaultUserId) ? 'selected' : ''}>${esc(u.name)}（${esc(u.username)}${u.studentNo ? ` · 学号 ${esc(u.studentNo)}` : ''}）</option>`).join('')}
              </select>
            </label>
            <p class="modal-note">${icon('info', 14)} 绑定后会将该账号学号更新为 ${esc(exception.username)}，姓名与院系以认证平台信息为准。</p>
          </div>
          <div class="auth-mode-fields ignore-only">
            <p class="modal-note">${icon('alert', 14)} 只在本地记录处理结果，不创建或修改账号；下次同步不会再重复上报该学号。</p>
          </div>
          <label class="field"><span>处理说明 / 核对依据 *</span><textarea name="note" rows="3" required minlength="2" maxlength="200" placeholder="例如：已核对认证平台与学籍信息，确认为同一名学生，同意创建账号"></textarea></label>
          <div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">取消</button><button class="btn btn-primary" type="submit">提交处理结果</button></div>
        </form>`
    }
  } else if (m.type === 'backup') {
    const summary = backupSummary(state)
    inner = `
      <span class="modal-icon">${icon('download', 24)}</span>
      <h2>数据备份与恢复</h2>
      <p class="modal-sub">把当前浏览器中的全部演示数据导出为 JSON 文件；导入备份会覆盖当前数据，请先确认。</p>
      <div class="backup-summary">
        <div><span>账号</span><strong>${summary.users}</strong></div>
        <div><span>自习室 / 座位</span><strong>${summary.rooms} / ${summary.seats}</strong></div>
        <div><span>预约记录</span><strong>${summary.bookings}</strong></div>
        <div><span>违约 / 黑名单</span><strong>${summary.violations} / ${summary.blacklist}</strong></div>
        <div><span>操作日志</span><strong>${summary.logs}</strong></div>
        <div><span>业务时间</span><strong>${summary.clock.slice(0, 16)}</strong></div>
      </div>
      <div class="backup-actions">
        <button class="btn btn-primary" data-action="export-backup">${icon('download', 16)} 导出 JSON 备份</button>
        <label class="btn btn-ghost file-btn">${icon('upload', 16)} 选择 JSON 备份文件<input type="file" accept=".json,application/json" data-backup-file></label>
      </div>
      <p class="modal-note">${icon('info', 14)} 备份包含账号密码、预约与日志，请妥善保管，不要公开发送；导入后当前数据会被完全替换，需要重新登录。</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">关闭</button></div>`
  } else if (m.type === 'backup-confirm') {
    const pending = ctx.pendingImport
    const summary = pending?.summary || backupSummary(state)
    inner = `
      <span class="modal-icon warn">${icon('upload', 24)}</span>
      <h2>导入备份并覆盖数据？</h2>
      <p class="modal-sub">文件：${esc(pending?.filename || '未命名')}${pending?.exportedAt ? `<br>导出时间：${esc(String(pending.exportedAt).slice(0, 16))}` : ''}</p>
      <div class="backup-summary">
        <div><span>账号</span><strong>${summary.users}</strong></div>
        <div><span>自习室 / 座位</span><strong>${summary.rooms} / ${summary.seats}</strong></div>
        <div><span>预约记录</span><strong>${summary.bookings}</strong></div>
        <div><span>操作日志</span><strong>${summary.logs}</strong></div>
      </div>
      <div class="notice notice-warning">${icon('alert', 18)}<div><strong>当前浏览器中的数据将被替换</strong><p>导入后需要使用备份中的账号重新登录，当前登录状态会退出。</p></div></div>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn btn-danger" data-action="modal-confirm">确认导入并覆盖</button></div>`
  } else if (m.type === 'checkin-qr') {
    const raw = bookingById(state, m.id)
    const booking = raw ? enrichBooking(state, raw) : null
    if (!booking) {
      inner = `<span class="modal-icon danger">${icon('alert', 24)}</span><h2>预约不存在</h2><p class="modal-sub">该预约可能已被删除或重置。</p><div class="modal-actions"><button class="btn btn-primary" data-action="close-modal">关闭</button></div>`
    } else {
      const startMs = bookingStartMs(raw)
      const deadlineMs = bookingDeadlineMs(raw)
      const canScan = raw.status === 'WAITING' && ctx.now >= startMs && ctx.now < deadlineMs
      const tooEarly = raw.status === 'WAITING' && ctx.now < startMs
      const payload = `JY-CHECKIN:${booking.code}:${booking.seatCode}:${booking.date}:${booking.start}`
      inner = `
        <span class="modal-icon">${icon('qr', 24)}</span>
        <h2>座位二维码签到</h2>
        <p class="modal-sub">到达自习室后扫描座位桌角的签到码。演示环境数据仅保存在本机浏览器，可用下方按钮模拟扫码。</p>
        <div class="qr-card">
          <div class="qr-frame">${qrSvg(payload, { cellSize: 6, margin: 4 })}</div>
          <div class="qr-info">
            <span class="eyebrow green">SEAT CHECK-IN</span>
            <strong>${esc(booking.roomName)} · ${esc(booking.seatCode)}</strong>
            <p>${booking.date} ${fmtRange(booking.start, booking.end)}<br>${esc(booking.seatType)} · ${fmtDuration(booking.duration)}</p>
            <span class="qr-code">${esc(booking.code)}</span>
            ${statusBadge(booking.status, booking.statusLabel)}
          </div>
        </div>
        <div class="qr-steps">
          <div><span>01</span><p>到达预约座位，核对桌角编号为 <strong>${esc(booking.seatCode)}</strong>。</p></div>
          <div><span>02</span><p>用手机扫描二维码；演示环境可直接点击下方按钮模拟扫码。</p></div>
          <div><span>03</span><p>签到成功后座位进入使用中，离开时记得签退。</p></div>
        </div>
        <p class="modal-note">${icon('info', 14)} 手机扫码无法读取本机 localStorage 数据，因此跨设备扫描仅用于展示；本机“模拟扫码签到”会真实写入签到记录。</p>
        ${raw.status !== 'WAITING' ? `<div class="notice notice-info">${icon('info', 18)}<div><p>该预约当前状态为“${esc(booking.statusLabel)}”，无需再次扫码签到。</p></div></div>` : ''}
        ${tooEarly ? `<div class="notice notice-warning">${icon('clock', 18)}<div><p>尚未到签到时间。可在“我的预约”或“预约日历”中点击“跳到签到时间”后再扫码。</p></div></div>` : ''}
        <div class="modal-actions">
          <button class="btn btn-ghost" data-action="close-modal">关闭</button>
          ${raw.status === 'WAITING' ? `<button class="btn btn-primary" data-action="scan-checkin" data-id="${raw.id}" ${canScan ? '' : 'disabled'}>${icon('qr', 16)} 模拟扫码签到</button>` : ''}
        </div>`
    }
  } else if (m.type === 'confirm') {
    inner = `
      <span class="modal-icon ${m.danger ? 'danger' : 'warn'}">${icon(m.icon || 'alert', 24)}</span>
      <h2>${esc(m.title || '请确认')}</h2>
      <p class="modal-sub">${m.text || ''}</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">取消</button><button class="btn ${m.danger ? 'btn-danger' : 'btn-primary'}" data-action="modal-confirm">${esc(m.confirmLabel || '确认')}</button></div>`
  }
  return `<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="对话框">
    <button class="icon-btn modal-close" data-action="close-modal" aria-label="关闭">${icon('close', 18)}</button>
    ${inner}
  </section></div>`
}

function enterSession(user, message) {
  ctx.state = state
  ctx.user = user
  ctx.now = clockNow(state)
  initUi()
  persist()
  const hashView = location.hash.replace(/^#\//, '')
  const allowed = ROLE_VIEWS[user.role] || []
  ctx.view = allowed.includes(hashView) ? hashView : ROLES[user.role].home
  history.replaceState(null, '', `#/${ctx.view}`)
  navigate(ctx.view, false)
  toast(message)
}

function doLogin(username, password) {
  try {
    const user = login(state, username, password, Date.now())
    enterSession(user, `登录成功，欢迎回来，${user.name}。`)
  } catch (error) {
    persist()
    const message = error instanceof RuleError ? error.message : '登录失败，请稍后重试。'
    renderLogin(message)
    toast(message, 'error')
  }
}

function runSweep({ notify = true } = {}) {
  const result = sweep(state, ctx.now)
  if (result.missed || result.completed || result.blacklisted) {
    persist()
    if (ctx.user) renderApp()
    if (notify && result.missed) {
      toast(`系统任务：${result.missed} 条预约超时未签到，座位已释放并生成违约记录。`, 'warning')
    }
  }
  return result
}

function performConfirm() {
  const m = ctx.modal
  if (!m) return
  const payload = m.payload || {}
  try {
    if (m.confirmAction === 'toggle-room') {
      const room = roomById(state, payload.id)
      toggleRoom(state, ctx.user, payload.id, payload.enabled, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast(`${room.name}已${payload.enabled ? '开放' : '停用'}，${payload.enabled ? '可接受新预约。' : '已有预约仍按原规则继续。'}`)
    } else if (m.confirmAction === 'delete-room') {
      deleteRoom(state, ctx.user, payload.id, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast('自习室已删除。')
    } else if (m.confirmAction === 'delete-seat') {
      deleteSeat(state, ctx.user, payload.id, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast('座位已删除。')
    } else if (m.confirmAction === 'import-backup') {
      applyImport()
    } else if (m.confirmAction === 'reset-demo') {
      store.reset()
      state = store.state
      ctx.state = state
      ctx.user = null
      ctx.now = clockNow(state)
      initUi()
      ctx.view = ''
      closeModal()
      history.replaceState(null, '', location.pathname)
      renderLogin()
      toast('演示数据已重置，并已退出登录。')
    }
  } catch (error) {
    closeModal()
    persist()
    renderApp()
    toast(error.message, 'error')
  }
}

function download(filename, text, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportBackup() {
  try {
    const text = backupJson(state, Date.now())
    const stamp = toLocal(Date.now(), true).replace(/[: ]/g, '-')
    download(`静园数据备份_${stamp}.json`, text, 'application/json;charset=utf-8')
    audit(state, ctx.user, 'BACKUP_EXPORT', `导出完整数据备份：账号 ${state.users.length} 个，预约 ${state.bookings.length} 条`, ctx.now)
    persist()
    toast('数据备份已导出为 JSON 文件。')
  } catch (error) {
    toast(error.message || '导出备份失败。', 'error')
  }
}

async function handleBackupFile(file) {
  if (!file) return
  try {
    const text = await file.text()
    const parsed = parseBackup(text)
    ctx.pendingImport = { ...parsed, filename: file.name }
    openModal({ type: 'backup-confirm', confirmAction: 'import-backup' })
  } catch (error) {
    toast(error.message || '备份文件读取失败。', 'error')
  }
}

function applyImport() {
  const pending = ctx.pendingImport
  if (!pending) {
    closeModal()
    toast('没有可导入的备份数据。', 'error')
    return
  }
  const actor = ctx.user
  try {
    state = store.replace(pending.state)
    state.session = null
    ctx.state = state
    ctx.now = clockNow(state)
    ctx.user = null
    ctx.view = ''
    ctx.pendingImport = null
    initUi()
    closeModal()
    audit(state, actor, 'BACKUP_IMPORT', `导入备份 ${pending.filename || ''}，覆盖当前浏览器数据`, ctx.now)
    persist()
    history.replaceState(null, '', location.pathname)
    renderLogin()
    toast('数据备份已导入，请使用备份中的账号重新登录。')
  } catch (error) {
    closeModal()
    toast(error.message || '导入备份失败。', 'error')
  }
}

function exportReport() {
  const { reportFrom, reportTo, reportRoomId } = ctx.ui
  const to = reportTo || todayKey(ctx.now)
  const from = reportFrom || addDays(to, -6)
  const roomId = Number(reportRoomId) || 0
  const rows = buildReportRows(state, { from, to, roomId, now: ctx.now })
  if (!rows.length) {
    toast('所选范围无统计数据，未生成报表。', 'error')
    return
  }
  const csv = csvText(
    ['日期', '星期', '自习室', '预约量', '签到量', '违约量', '取消量', '使用时长(小时)', '座位利用率(%)'],
    rows.map((r) => [r.date, r.weekday, r.roomName, r.total, r.attended, r.missed, r.cancelled, r.hours, r.utilization])
  )
  download(`自习室预约统计_${from}_${to}.csv`, csv)
  audit(state, ctx.user, 'REPORT_EXPORT', `导出 ${from} 至 ${to} 预约统计报表，共 ${rows.length} 行`, ctx.now)
  persist()
  toast('统计报表已导出为 CSV。')
}

function exportReservations() {
  const { adminDate, adminRoomId, adminStatus, adminKeyword, reportFrom, reportTo, reportRoomId } = ctx.ui
  const useReport = ctx.view === 'reports'
  const date = useReport ? null : (adminDate || todayKey(ctx.now))
  const roomId = Number(useReport ? reportRoomId : adminRoomId) || 0
  const status = useReport ? 'ALL' : (adminStatus || 'ALL')
  const keyword = useReport ? '' : String(adminKeyword || '').trim().toLowerCase()
  const to = useReport ? (reportTo || todayKey(ctx.now)) : date
  const from = useReport ? (reportFrom || addDays(to, -6)) : date
  let rows = state.bookings
    .filter((b) => (date === 'ALL' || (b.date >= from && b.date <= to)) && (!roomId || b.roomId === roomId) && (status === 'ALL' || b.status === status))
    .map((b) => enrichBooking(state, b))
  if (keyword) rows = rows.filter((b) => [b.studentName, b.studentNo, b.roomName, b.seatCode, b.code].join(' ').toLowerCase().includes(keyword))
  rows.sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  if (!rows.length) {
    toast('当前筛选范围没有可导出的预约记录。', 'error')
    return
  }
  const csv = csvText(
    ['预约编号', '学生姓名', '学号', '院系', '自习室', '座位', '日期', '开始', '结束', '状态', '签到时间', '取消原因'],
    rows.map((b) => [b.code, b.studentName, maskStudentNo(b.studentNo), b.dept, b.roomName, b.seatCode, b.date, b.start, b.end,
      b.statusLabel, b.checkedInAt || '', b.cancelReason || ''])
  )
  download(`预约明细_${date === 'ALL' ? '全部' : from === to ? from : `${from}_${to}`}.csv`, csv)
  audit(state, ctx.user, 'REPORT_EXPORT', `导出预约明细 ${rows.length} 条`, ctx.now)
  persist()
  toast(`已导出 ${rows.length} 条预约明细。`)
}

function exportLogs() {
  const rows = state.logs.slice().reverse()
  if (!rows.length) {
    toast('暂无日志可导出。', 'error')
    return
  }
  const csv = csvText(
    ['时间', '操作人', '角色', '操作类型', '对象', '详情', '结果', 'IP'],
    rows.map((l) => [l.createdAt, l.actorName, ROLES[l.actorRole]?.label || '系统任务', ACTION_LABELS[l.action] || l.action, l.target, l.detail, l.result, l.ip])
  )
  download(`系统操作日志_${localDate(ctx.now)}.csv`, csv)
  audit(state, ctx.user, 'REPORT_EXPORT', `导出操作日志 ${rows.length} 条`, ctx.now)
  persist()
  toast(`已导出 ${rows.length} 条操作日志。`)
}

function handleBind(el) {
  const bind = el.dataset.bind
  if (!bind) return
  const value = el.dataset.type === 'number' ? Number(el.value) : el.value
  ctx.ui[bind] = value
  if (bind === 'start' || bind === 'roomId' || bind === 'date') ctx.ui.seatId = null
  if (bind.startsWith('log')) ctx.ui.logPage = 1
  renderApp({ focus: bind })
}

function handleAction(action, el) {
  ctx.now = clockNow(state)
  const swept = sweep(state, ctx.now)
  if (swept.missed || swept.completed || swept.blacklisted) persist()
  touchSession(state, Date.now())
  const id = Number(el.dataset.id)
  try {
    switch (action) {
      case 'quick-login':
        doLogin(el.dataset.username, DEMO_PASSWORD)
        return
      case 'open-register':
        openModal({ type: 'register' })
        return
      case 'open-auth-exception': {
        const username = el.dataset.username
        const exception = (state.authSync.exceptions || []).find((item) => item.username === username)
        if (!exception) {
          toast('该异常已处理或不存在，请重新同步后查看。', 'error')
          return
        }
        openModal({ type: 'auth-exception', username, mode: userByName(state, username) ? 'bind' : 'create' })
        return
      }
      case 'nav':
        closeModal()
        navigate(el.dataset.view)
        return
      case 'toggle-menu':
        document.querySelector('.app-shell')?.classList.toggle('nav-open')
        return
      case 'logout': {
        logout(state, ctx.user, Date.now())
        persist()
        ctx.user = null
        ctx.view = ''
        closeModal()
        history.replaceState(null, '', location.pathname)
        renderLogin()
        toast('已退出登录。')
        return
      }
      case 'pick-date':
        ctx.ui.date = el.dataset.date
        ctx.ui.seatId = null
        renderApp()
        return
      case 'pick-seat':
        if (el.disabled) return
        ctx.ui.seatId = id
        renderApp()
        return
      case 'open-book':
        if (!ctx.ui.seatId) return
        openModal({ type: 'book', seatId: ctx.ui.seatId, date: ctx.ui.date, start: ctx.ui.start, end: ctx.ui.end })
        return
      case 'confirm-book': {
        const booking = createBooking(state, ctx.user, {
          seatId: ctx.ui.seatId, date: ctx.ui.date, start: ctx.ui.start, end: ctx.ui.end
        }, ctx.now)
        ctx.ui.seatId = null
        closeModal()
        persist()
        renderApp()
        toast(`预约成功：${booking.code}，请于 ${booking.checkinDeadline.slice(0, 16)} 前签到。`)
        return
      }
      case 'open-cancel':
        openModal({ type: 'cancel', id })
        return
      case 'checkin': {
        const booking = checkIn(state, ctx.user, id, ctx.now)
        persist()
        renderApp()
        toast(`签到成功：${booking.roomName} ${booking.seatCode}，祝你学习顺利。`)
        return
      }
      case 'open-checkin-qr': {
        const booking = bookingById(state, id)
        if (!booking) return
        if (booking.status !== 'WAITING') {
          toast('该预约当前不可使用签到码。', 'error')
          return
        }
        openModal({ type: 'checkin-qr', id })
        return
      }
      case 'open-backup':
        ctx.pendingImport = null
        openModal({ type: 'backup' })
        return
      case 'export-backup':
        exportBackup()
        return
      case 'scan-checkin': {
        const booking = checkIn(state, ctx.user, id, ctx.now, 'QR')
        closeModal()
        persist()
        renderApp()
        toast(`扫码签到成功：${booking.roomName} ${booking.seatCode}，座位已入座。`)
        return
      }
      case 'checkout': {
        const booking = checkOut(state, ctx.user, id, ctx.now)
        persist()
        renderApp()
        toast(`签退成功，${booking.roomName} ${booking.seatCode} 已释放。`)
        return
      }
      case 'jump-book': {
        const booking = bookingById(state, id)
        if (!booking) return
        setDemoTime(state, bookingStartMs(booking), Date.now())
        ctx.now = clockNow(state)
        runSweep({ notify: false })
        persist()
        renderApp()
        toast('演示时间已跳到预约开始时刻，现在可以签到。')
        return
      }
      case 'open-demo-clock':
        openModal({ type: 'demo' })
        return
      case 'advance-demo': {
        const minutes = Number(el.dataset.minutes)
        advanceDemoTime(state, minutes, Date.now())
        ctx.now = clockNow(state)
        const result = runSweep({ notify: true })
        closeModal()
        persist()
        renderApp()
        toast(`演示时间已推进 ${minutes} 分钟${result.completed ? `，${result.completed} 条预约自动完成` : ''}。`)
        return
      }
      case 'open-reset':
        openModal({ type: 'reset' })
        return
      case 'modal-confirm':
        performConfirm()
        return
      case 'close-modal':
        closeModal()
        return
      case 'refresh': {
        ctx.now = clockNow(state)
        runSweep({ notify: false })
        renderApp()
        toast('数据已刷新。')
        return
      }
      case 'set-mine-filter':
        ctx.ui.mineStatus = el.dataset.value
        renderApp()
        return
      case 'open-room':
        openModal({ type: 'room', id: el.dataset.id ? Number(el.dataset.id) : null })
        return
      case 'toggle-room': {
        const room = roomById(state, id)
        const active = state.bookings.filter((b) => b.roomId === id && ['WAITING', 'CHECKED_IN'].includes(b.status)).length
        openModal({
          type: 'confirm', icon: room.enabled ? 'door' : 'check', danger: false,
          title: `${room.enabled ? '停用' : '开放'}自习室「${room.name}」？`,
          text: room.enabled
            ? `停用后不再接受新预约。${active ? `当前有 <strong>${active}</strong> 条进行中的预约，将按原规则继续签到与完成。` : '当前没有进行中的预约。'}`
            : '开放后学生可以重新预约该自习室的座位。',
          confirmLabel: room.enabled ? '确认停用' : '确认开放',
          confirmAction: 'toggle-room', payload: { id, enabled: !room.enabled }
        })
        return
      }
      case 'delete-room': {
        const room = roomById(state, id)
        openModal({
          type: 'confirm', icon: 'trash', danger: true, title: `删除「${room.name}」？`,
          text: '仅当该自习室没有任何预约记录时才能删除；存在历史预约的房间请使用“停用”。',
          confirmLabel: '确认删除', confirmAction: 'delete-room', payload: { id }
        })
        return
      }
      case 'open-seat':
        openModal({ type: 'seat', id: el.dataset.id ? Number(el.dataset.id) : null, roomId: Number(el.dataset.room) || ctx.ui.adminSeatRoomId })
        return
      case 'toggle-seat': {
        const seat = seatById(state, id)
        setSeatEnabled(state, ctx.user, id, !seat.enabled, ctx.now)
        persist()
        renderApp()
        toast(`座位 ${seat.code} 已${seat.enabled ? '启用' : '停用维护'}。`)
        return
      }
      case 'delete-seat': {
        const seat = seatById(state, id)
        openModal({
          type: 'confirm', icon: 'trash', danger: true, title: `删除座位 ${seat.code}？`,
          text: '存在预约记录的座位不可删除；如仅需暂停使用，请改为“维修停用”。',
          confirmLabel: '确认删除', confirmAction: 'delete-seat', payload: { id }
        })
        return
      }
      case 'open-batch':
        openModal({ type: 'batch', roomId: Number(el.dataset.id) })
        return
      case 'open-unblacklist':
        openModal({ type: 'unblacklist', userId: id })
        return
      case 'view-booking':
        openModal({ type: 'booking', id })
        return
      case 'set-report-range': {
        const days = Number(el.dataset.days)
        ctx.ui.reportFrom = addDays(todayKey(ctx.now), -(days - 1))
        ctx.ui.reportTo = todayKey(ctx.now)
        renderApp()
        return
      }
      case 'export-report':
        exportReport()
        return
      case 'export-reservations':
        exportReservations()
        return
      case 'export-logs':
        exportLogs()
        return
      case 'clear-reservation-filters':
        ctx.ui.adminDate = todayKey(ctx.now)
        ctx.ui.adminRoomId = 0
        ctx.ui.adminStatus = 'ALL'
        ctx.ui.adminKeyword = ''
        renderApp()
        return
      case 'set-analytics-days':
        ctx.ui.analyticsDays = Number(el.dataset.days)
        renderApp()
        return
      case 'calendar-prev':
      case 'calendar-next':
      case 'calendar-today': {
        const current = ctx.ui.calendarMonth || monthKeyOf(ctx.now)
        let month = current
        if (action === 'calendar-prev') month = addMonths(current, -1)
        if (action === 'calendar-next') month = addMonths(current, 1)
        if (action === 'calendar-today') month = monthKeyOf(ctx.now)
        ctx.ui.calendarMonth = month
        const today = localDate(ctx.now)
        ctx.ui.calendarDate = today.startsWith(month) ? today : `${month}-01`
        renderApp()
        return
      }
      case 'calendar-select': {
        const date = el.dataset.date
        ctx.ui.calendarDate = date
        ctx.ui.calendarMonth = date.slice(0, 7)
        renderApp()
        return
      }
      case 'log-page':
        ctx.ui.logPage = Math.max(1, Number(el.dataset.page))
        renderApp()
        return
      case 'open-user':
        openModal({ type: 'user', id: el.dataset.id ? Number(el.dataset.id) : null })
        return
      case 'unlock-user': {
        const user = unlockUser(state, ctx.user, id, ctx.now)
        persist()
        renderApp()
        toast(`账号 ${user.username} 已解锁，失败次数已清零。`)
        return
      }
      case 'sync-auth': {
        const result = simulateAuthSync(state, ctx.user, ctx.now)
        persist()
        renderApp()
        toast(`统一认证同步完成：新增 ${result.created} 个，更新 ${result.updated} 个，异常 ${result.exceptions.length} 个。`)
        return
      }
      case 'reset-config-form':
        renderApp()
        toast('已恢复为当前保存的配置值。')
        return
      default:
        return
    }
  } catch (error) {
    if (error instanceof RuleError) {
      persist()
      renderApp()
      toast(error.message, 'error')
    } else {
      console.error(error)
      toast('操作失败，请稍后重试。', 'error')
    }
  }
}

function handleSubmit(form) {
  const kind = form.dataset.form
  const data = Object.fromEntries(new FormData(form).entries())
  ctx.now = clockNow(state)
  try {
    if (kind === 'login') {
      doLogin(data.username, data.password)
      return
    }
    if (kind === 'register') {
      if (data.password !== data.confirmPassword) {
        toast('两次输入的密码不一致，请重新输入。', 'error')
        return
      }
      const user = registerUser(state, data, ctx.now)
      login(state, user.username, data.password, Date.now())
      closeModal()
      enterSession(user, `注册成功，已为你登录，${user.name}。`)
      return
    }
    if (kind === 'cancel') {
      const booking = cancelBooking(state, ctx.user, ctx.modal.id, ctx.now, data.reason)
      closeModal()
      persist()
      renderApp()
      toast(`已取消 ${booking.roomName} ${booking.seatCode} 的预约，座位已释放。`)
      return
    }
    if (kind === 'demo-time') {
      const target = parseLocal(data.time)
      setDemoTime(state, target, Date.now())
      ctx.now = clockNow(state)
      closeModal()
      const result = runSweep({ notify: true })
      persist()
      renderApp()
      toast(`演示时间已调整为 ${toLocal(target)}${result.missed ? `，${result.missed} 条预约超时失约` : ''}。`)
      return
    }
    if (kind === 'room') {
      const room = saveRoom(state, ctx.user, data, ctx.now)
      closeModal()
      if (!ctx.ui.adminSeatRoomId) ctx.ui.adminSeatRoomId = room.id
      persist()
      renderApp()
      toast(`自习室「${room.name}」已保存。`)
      return
    }
    if (kind === 'seat') {
      const payload = { ...data, enabled: data.enabled === 'true' }
      saveSeat(state, ctx.user, payload, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast('座位信息已保存。')
      return
    }
    if (kind === 'batch') {
      batchSeats(state, ctx.user, Number(data.roomId), Number(data.rows), Number(data.columns), data.prefix, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast(`已批量生成 ${Number(data.rows) * Number(data.columns)} 个座位。`)
      return
    }
    if (kind === 'unblacklist') {
      unblacklist(state, ctx.user, Number(data.userId), data.reason, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast('黑名单已解除，学生预约权限已恢复。')
      return
    }
    if (kind === 'auth-exception') {
      const result = resolveAuthException(state, ctx.user, data, ctx.now)
      closeModal()
      persist()
      renderApp()
      toast(`认证异常 ${result.username} 已处理：${AUTH_MODE_LABELS[result.mode] || '处理完成'}。`)
      return
    }
    if (kind === 'user') {
      if (data.id) {
        updateUser(state, ctx.user, Number(data.id), {
          name: data.name, role: data.role, enabled: data.enabled === 'true', studentNo: data.studentNo, dept: data.dept
        }, ctx.now)
        closeModal()
        persist()
        renderApp()
        toast('账号权限已更新。')
      } else {
        const user = createUser(state, ctx.user, data, ctx.now)
        closeModal()
        persist()
        renderApp()
        toast(`账号 ${user.username} 已创建，初始密码 ${DEMO_PASSWORD}。`)
      }
      return
    }
    if (kind === 'config') {
      const { changes } = saveConfig(state, ctx.user, data, ctx.now)
      persist()
      renderApp()
      toast(changes.length ? `配置已保存，共 ${changes.length} 项变更。` : '配置未发生变化。')
      return
    }
  } catch (error) {
    if (error instanceof RuleError) {
      persist()
      if (!form.closest('.modal')) renderApp()
      toast(error.message, 'error')
    } else {
      console.error(error)
      toast('提交失败，请稍后重试。', 'error')
    }
  }
}

/* --------------------------------- 事件绑定 --------------------------------- */

document.addEventListener('click', (event) => {
  const actionEl = event.target.closest('[data-action]')
  if (actionEl && !actionEl.disabled) {
    event.preventDefault()
    handleAction(actionEl.dataset.action, actionEl)
    return
  }
  if (event.target.classList?.contains('modal-backdrop')) closeModal()
})

document.addEventListener('change', (event) => {
  const fileEl = event.target.closest('[data-backup-file]')
  if (fileEl) {
    const file = fileEl.files?.[0]
    fileEl.value = ''
    if (file) handleBackupFile(file)
    return
  }
  const modeEl = event.target.closest('[data-auth-mode]')
  if (modeEl) {
    const form = modeEl.closest('form')
    if (form) form.dataset.mode = modeEl.value
    return
  }
  const el = event.target.closest('[data-bind]')
  if (el && el.tagName !== 'BUTTON') handleBind(el)
})

let inputTimer = null
document.addEventListener('input', (event) => {
  const el = event.target.closest('input[data-bind]')
  if (!el || el.type === 'date' || el.type === 'time' || el.type === 'datetime-local') return
  clearTimeout(inputTimer)
  const value = el.value
  inputTimer = setTimeout(() => {
    ctx.ui[el.dataset.bind] = value
    renderApp({ focus: el.dataset.bind })
  }, 260)
})

document.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-form]')
  if (!form) return
  event.preventDefault()
  handleSubmit(form)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && ctx.modal) closeModal()
})

window.addEventListener('hashchange', () => {
  if (!ctx.user) return
  const view = location.hash.replace(/^#\//, '')
  if (view && ROLE_VIEWS[ctx.user.role]?.includes(view) && view !== ctx.view) {
    ctx.view = view
    renderApp()
  }
})

function boot() {
  const params = new URLSearchParams(location.search)
  if (params.get('reset') === '1') {
    store.reset()
    state = store.state
    ctx.state = state
    history.replaceState(null, '', location.pathname + location.hash)
  }
  ctx.now = clockNow(state)
  const hadSession = Boolean(state.session)
  let user = sessionUser(state, Date.now())
  let autoLoggedIn = false
  if (!user) {
    const as = params.get('as')
    if (as && userByName(state, as)) {
      try {
        user = login(state, as, DEMO_PASSWORD, Date.now())
        autoLoggedIn = true
        history.replaceState(null, '', location.pathname + location.hash)
      } catch {
        user = null
      }
    }
  }
  if (hadSession && !user) persist()
  if (user) {
    ctx.user = user
    if (autoLoggedIn) persist()
    initUi()
    runSweep({ notify: false })
    const hashView = location.hash.replace(/^#\//, '')
    const allowed = ROLE_VIEWS[user.role] || []
    ctx.view = allowed.includes(hashView) ? hashView : ROLES[user.role].home
    if (location.hash !== `#/${ctx.view}`) history.replaceState(null, '', `#/${ctx.view}`)
    renderApp()
    if (store.recovered) toast('检测到本地数据损坏，已重新生成演示数据。', 'warning')
  } else {
    initUi()
    renderLogin()
  }

  setInterval(() => {
    ctx.now = clockNow(state)
    updateClock()
  }, 1000)

  setInterval(() => {
    if (!ctx.user) return
    const current = sessionUser(state, Date.now())
    if (!current) {
      persist()
      closeModal()
      ctx.user = null
      ctx.view = ''
      renderLogin('登录已过期，请重新登录。')
      toast('会话已超时，请重新登录。', 'warning')
      return
    }
    runSweep({ notify: true })
  }, 30000)
}

boot()
