import {
  ACTION_LABELS, AUTH_MODE_LABELS, CONFIG_FIELDS, ROLE_KEYS, ROLES, activeBlacklist, roleLabel, roomOpenHours, roomSeatCount
} from '../core/rules.js'
import { localDate, toLocal } from '../core/time.js'
import { esc, icon, emptyState, statCard, sectionTitle, chip } from './components.js'

function realStamp(ms) {
  return Number.isFinite(ms) && ms > 0 ? toLocal(ms, true).slice(0, 16) : '—'
}

export function renderSysDashboard(ctx) {
  const { state } = ctx
  const today = localDate(ctx.now)
  const students = state.users.filter((u) => u.role === 'STUDENT').length
  const staff = state.users.length - students
  const todayBookings = state.bookings.filter((b) => b.date === today)
  const activeBlack = state.blacklist.filter((b) => b.status === 'ACTIVE').length
  const recentLogs = state.logs.slice(-6).reverse()
  const locked = Object.entries(state.loginAttempts).filter(([, attempt]) => attempt.lockedUntil > Date.now())
  return `
    <div class="stat-grid four">
      ${statCard({ label: '系统账号', value: state.users.length, unit: '个', iconName: 'users', hint: `学生 ${students} · 教职工 ${staff}` })}
      ${statCard({ label: '今日预约', value: todayBookings.length, unit: '条', iconName: 'calendar', tone: 'sage', hint: `进行中 ${todayBookings.filter((b) => ['WAITING', 'CHECKED_IN'].includes(b.status)).length} 条` })}
      ${statCard({ label: '黑名单学生', value: activeBlack, unit: '人', iconName: 'shield', tone: activeBlack ? 'clay' : 'green', hint: '系统按阈值自动加入' })}
      ${statCard({ label: '操作日志', value: state.logs.length, unit: '条', iconName: 'list', tone: 'gold', hint: '最近 1500 条保留' })}
    </div>

    ${locked.length ? `<div class="notice notice-warning">${icon('lock', 19)}<div><strong>${locked.length} 个账号处于登录锁定</strong><p>连续认证失败达到阈值会临时锁定。可在账号权限中解锁并清零失败次数。</p></div><button class="btn btn-ghost btn-sm" data-action="nav" data-view="accounts">前往处理</button></div>` : ''}

    <div class="dashboard-grid">
      <section class="panel">
        ${sectionTitle('系统运行概况', '本地部署 · 无数据库 · 浏览器持久化', '')}
        <div class="system-list">
          <div><span class="system-icon">${icon('building', 18)}</span><div><strong>自习室与座位</strong><small>${state.rooms.length} 间自习室 · ${state.seats.length} 个座位 · 开放 ${state.rooms.filter((r) => r.enabled).length} 间</small></div><span class="status status-free"><i></i>正常</span></div>
          <div><span class="system-icon">${icon('activity', 18)}</span><div><strong>超时未签到任务</strong><small>页面打开时每 30 秒扫描一次，幂等处理超时预约并释放座位</small></div><span class="status status-free"><i></i>运行中</span></div>
          <div><span class="system-icon">${icon('lock', 18)}</span><div><strong>登录安全策略</strong><small>失败 ${state.config.loginFailLimit} 次锁定 ${state.config.loginLockMinutes} 分钟 · 会话 ${state.config.sessionMinutes} 分钟超时</small></div><span class="status status-free"><i></i>已启用</span></div>
          <div><span class="system-icon">${icon('sync', 18)}</span><div><strong>统一身份认证</strong><small>${state.authSync.lastAt ? `最近同步 ${state.authSync.lastAt.slice(0, 16)}` : '尚未执行同步，可在认证对接中手动触发'}</small></div><span class="status ${state.authSync.lastAt ? 'status-free' : 'status-waiting'}"><i></i>${state.authSync.lastAt ? '已同步' : '待同步'}</span></div>
          <div><span class="system-icon">${icon('settings', 18)}</span><div><strong>业务参数</strong><small>预约 ${state.config.minDuration}–${state.config.maxDuration} 分钟 · 提前 ${state.config.advanceDays} 天 · 违约阈值 ${state.config.violationThreshold} 次</small></div><button class="text-btn" data-action="nav" data-view="config">调整</button></div>
        </div>
      </section>
      <section class="panel">
        ${sectionTitle('近 7 天预约', '系统整体运行趋势', '')}
        <div class="mini-bars">
          ${Array.from({ length: 7 }, (_, i) => {
            const date = localDate(ctx.now - (6 - i) * 86400000)
            const value = state.bookings.filter((b) => b.date === date).length
            return { date, value }
          }).map(({ date, value }) => `<div class="mini-bar"><strong>${value}</strong><div><span style="height:${Math.max(4, value / Math.max(1, ...Array.from({ length: 7 }, (_, i) => state.bookings.filter((b) => b.date === localDate(ctx.now - (6 - i) * 86400000)).length)) * 100)}%"></span></div><small>${date.slice(5)}</small></div>`).join('')}
        </div>
        <div class="chart-foot"><span>座位总数 <strong>${state.seats.length}</strong></span><span>今日违约 <strong>${todayBookings.filter((b) => b.status === 'MISSED').length}</strong></span></div>
      </section>
    </div>

    <section class="panel">
      ${sectionTitle('最近操作日志', '所有关键操作留痕，可审计追溯', `<button class="btn btn-ghost btn-sm" data-action="nav" data-view="logs">查看全部 ${icon('arrow', 15)}</button>`)}
      ${recentLogs.length ? `<div class="log-mini-list">${recentLogs.map((log) => `<div class="log-mini">
        <span class="log-dot ${log.result === '失败' ? 'fail' : ''}"></span>
        <div><strong>${esc(log.actorName)} · ${esc(ACTION_LABELS[log.action] || log.action)}</strong><p>${esc(log.detail)}</p></div>
        <small>${log.createdAt.slice(5, 16)}</small>
      </div>`).join('')}</div>` : emptyState({ iconName: 'list', title: '暂无操作日志' })}
    </section>

    <div class="quick-link-grid">
      ${[
        { view: 'accounts', title: '账号与角色权限', desc: '分配角色、启停账号、解锁登录', icon: 'users' },
        { view: 'logs', title: '系统操作日志', desc: '按账号、时间、类型审计查询', icon: 'list' },
        { view: 'auth', title: '统一身份认证', desc: '模拟同步校园身份与异常清单', icon: 'sync' },
        { view: 'config', title: '系统基础配置', desc: '预约规则、违约阈值与安全策略', icon: 'settings' }
      ].map((item) => `<button class="quick-link" data-action="nav" data-view="${item.view}"><span>${icon(item.icon, 20)}</span><div><strong>${item.title}</strong><small>${item.desc}</small></div>${icon('arrow', 16)}</button>`).join('')}
    </div>`
}

function accountStatus(state, user) {
  const attempt = state.loginAttempts[user.username]
  if (!user.enabled) return { key: 'disabled', label: '已停用', cls: 'status-disabled' }
  if (attempt?.lockedUntil > Date.now()) return { key: 'locked', label: '登录锁定', cls: 'status-missed' }
  return { key: 'enabled', label: '正常', cls: 'status-free' }
}

export function renderSysAccounts(ctx) {
  const { state, ui } = ctx
  const keyword = String(ui.accountKeyword || '').trim().toLowerCase()
  const roleFilter = ui.accountRole || 'ALL'
  const users = state.users
    .filter((u) => roleFilter === 'ALL' || u.role === roleFilter)
    .filter((u) => !keyword || [u.name, u.username, u.studentNo, u.dept].join(' ').toLowerCase().includes(keyword))
  const roleCounts = ROLE_KEYS.map((role) => ({ role, count: state.users.filter((u) => u.role === role).length }))
  const locked = state.users.filter((u) => accountStatus(state, u).key === 'locked').length
  return `
    <div class="stat-grid four">
      ${statCard({ label: '账号总数', value: state.users.length, unit: '个', iconName: 'users', hint: `学生 ${state.users.filter((u) => u.role === 'STUDENT').length} 个` })}
      ${statCard({ label: '管理员账号', value: state.users.filter((u) => u.role !== 'STUDENT').length, unit: '个', iconName: 'shield', tone: 'gold', hint: '自习室 / 图书馆 / 系统' })}
      ${statCard({ label: '登录锁定', value: locked, unit: '个', iconName: 'lock', tone: locked ? 'danger' : 'green', hint: `失败阈值 ${state.config.loginFailLimit} 次` })}
      ${statCard({ label: '停用账号', value: state.users.filter((u) => !u.enabled).length, unit: '个', iconName: 'user', tone: 'clay', hint: '停用后立即失效' })}
    </div>
    <section class="panel">
      ${sectionTitle('账号与角色权限分配', '最小权限原则；最高权限账号不可修改或停用', `<button class="btn btn-primary" data-action="open-user">${icon('plus', 16)} 创建账号</button>`)}
      <div class="filter-row wrap">
        <label class="field compact"><span>角色</span><select data-bind="accountRole" data-refresh="admin">
          <option value="ALL">全部角色</option>${ROLE_KEYS.map((role) => `<option value="${role}" ${roleFilter === role ? 'selected' : ''}>${roleLabel(role)}</option>`).join('')}
        </select></label>
        <label class="field compact grow"><span>搜索</span><div class="search-box">${icon('search', 15)}<input data-bind="accountKeyword" data-refresh="admin" placeholder="姓名 / 账号 / 学号 / 院系" value="${esc(ui.accountKeyword || '')}"></div></label>
        <div class="role-counts">${roleCounts.map(({ role, count }) => `<span>${roleLabel(role)} <strong>${count}</strong></span>`).join('')}</div>
      </div>
      ${users.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>账号</th><th>姓名 / 院系</th><th>角色</th><th>状态</th><th>创建时间</th><th class="align-right">操作</th></tr></thead>
        <tbody>${users.map((user) => {
          const status = accountStatus(state, user)
          const attempt = state.loginAttempts[user.username]
          return `<tr>
            <td><div class="cell-main"><strong class="mono">${esc(user.username)}</strong><small>${user.studentNo ? esc(user.studentNo) : '教职工账号'}</small></div></td>
            <td><div class="cell-main"><strong>${esc(user.name)}</strong><small>${esc(user.dept || '—')}</small></div></td>
            <td>${chip(roleLabel(user.role), user.role === 'SYS_ADMIN' ? 'gold' : user.role === 'ROOM_ADMIN' ? 'clay' : user.role === 'LIB_ADMIN' ? 'blue' : 'green')}</td>
            <td><span class="status ${status.cls}"><i></i>${status.label}</span>${attempt?.lockedUntil > Date.now() ? `<small class="cell-hint">至 ${realStamp(attempt.lockedUntil)}</small>` : ''}</td>
            <td>${user.createdAt?.slice(0, 10) || '—'}</td>
            <td class="align-right"><div class="row-actions">
              ${attempt?.lockedUntil > Date.now() ? `<button class="btn btn-ghost btn-xs" data-action="unlock-user" data-id="${user.id}">${icon('unlock', 13)} 解锁</button>` : ''}
              <button class="btn btn-ghost btn-xs" data-action="open-user" data-id="${user.id}">${icon('edit', 13)} 权限</button>
            </div></td>
          </tr>`
        }).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'users', title: '未找到匹配账号', text: '请调整搜索条件。' })}
    </section>`
}

export function renderSysLogs(ctx) {
  const { state, ui } = ctx
  const action = ui.logAction || 'ALL'
  const result = ui.logResult || 'ALL'
  const keyword = String(ui.logKeyword || '').trim().toLowerCase()
  const pageSize = 20
  let page = Number(ui.logPage) || 1
  const filtered = state.logs
    .filter((log) => action === 'ALL' || log.action === action)
    .filter((log) => result === 'ALL' || log.result === result)
    .filter((log) => !keyword || [log.actorName, log.detail, log.target, log.ip].join(' ').toLowerCase().includes(keyword))
    .slice()
    .reverse()
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  if (page > pages) page = pages
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const actions = ['ALL', ...Object.keys(ACTION_LABELS)]
  return `
    <div class="stat-grid three">
      ${statCard({ label: '日志总量', value: state.logs.length, unit: '条', iconName: 'list', hint: '保留最近 1500 条' })}
      ${statCard({ label: '失败 / 提示', value: state.logs.filter((l) => l.result !== '成功').length, unit: '条', iconName: 'alert', tone: 'clay', hint: '登录失败、会话超时等' })}
      ${statCard({ label: '当前筛选结果', value: filtered.length, unit: '条', iconName: 'filter', tone: 'gold', hint: '分页展示，每页 20 条' })}
    </div>
    <section class="panel">
      ${sectionTitle('系统操作日志', '日志只读，禁止修改或删除；查询行为本身也纳入审计', `<button class="btn btn-ghost btn-sm" data-action="export-logs">${icon('download', 15)} 导出日志</button>`)}
      <div class="filter-row wrap">
        <label class="field compact"><span>操作类型</span><select data-bind="logAction" data-refresh="admin">
          ${actions.map((a) => `<option value="${a}" ${action === a ? 'selected' : ''}>${a === 'ALL' ? '全部类型' : ACTION_LABELS[a]}</option>`).join('')}
        </select></label>
        <label class="field compact"><span>结果</span><select data-bind="logResult" data-refresh="admin">
          ${['ALL', '成功', '失败', '提示'].map((r) => `<option value="${r}" ${result === r ? 'selected' : ''}>${r === 'ALL' ? '全部结果' : r}</option>`).join('')}
        </select></label>
        <label class="field compact grow"><span>搜索</span><div class="search-box">${icon('search', 15)}<input data-bind="logKeyword" data-refresh="admin" placeholder="操作人 / 内容 / 对象 / IP" value="${esc(ui.logKeyword || '')}"></div></label>
      </div>
      ${rows.length ? `<div class="table-wrap"><table class="data-table log-table">
        <thead><tr><th>时间</th><th>操作人</th><th>角色</th><th>操作类型</th><th>对象</th><th>详情</th><th>结果</th><th>IP</th></tr></thead>
        <tbody>${rows.map((log) => `<tr>
          <td class="nowrap">${log.createdAt.slice(0, 16)}</td>
          <td>${esc(log.actorName)}</td>
          <td><small class="muted">${roleLabel(log.actorRole)}</small></td>
          <td>${chip(ACTION_LABELS[log.action] || log.action, 'soft')}</td>
          <td>${log.target ? `<span class="mono">${esc(log.target)}</span>` : '—'}</td>
          <td class="log-detail">${esc(log.detail)}</td>
          <td><span class="status ${log.result === '成功' ? 'status-free' : log.result === '失败' ? 'status-missed' : 'status-waiting'}"><i></i>${esc(log.result)}</span></td>
          <td><small class="mono">${esc(log.ip)}</small></td>
        </tr>`).join('')}</tbody>
      </table></div>` : emptyState({ iconName: 'search', title: '未查询到日志', text: '请调整筛选条件。' })}
      <div class="pagination">
        <span>共 ${filtered.length} 条 · 第 ${page} / ${pages} 页</span>
        <div><button class="btn btn-ghost btn-xs" data-action="log-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>${icon('chevron-left', 14)} 上一页</button>
        <button class="btn btn-ghost btn-xs" data-action="log-page" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>下一页 ${icon('arrow', 14)}</button></div>
      </div>
    </section>`
}

export function renderSysAuth(ctx) {
  const { state } = ctx
  const sync = state.authSync
  const exceptions = sync.exceptions || []
  const resolvedEntries = Object.entries(sync.resolved || {}).sort((a, b) => String(b[1].at).localeCompare(String(a[1].at)))
  const created = state.users.filter((u) => ['20260201', '20260202'].includes(u.username))
  return `
    <div class="auth-layout">
      <section class="panel">
        ${sectionTitle('校园统一身份认证', '真实部署时由校园认证平台完成身份校验；本演示使用本地模拟', `<span class="status ${sync.lastAt ? 'status-free' : 'status-waiting'}"><i></i>${sync.lastAt ? '已同步' : '待同步'}</span>`)}
        <div class="auth-hero">
          <span class="auth-icon">${icon('sync', 30)}</span>
          <div><h3>${sync.lastAt ? '最近一次同步已完成' : '尚未执行身份同步'}</h3>
          <p>${sync.lastAt ? `同步时间 ${sync.lastAt.slice(0, 16)} · 操作人 ${esc(sync.operator || '系统管理员')}` : '点击下方按钮，模拟从校园统一身份认证平台拉取增量师生名单。'}</p></div>
        </div>
        <div class="auth-actions">
          <button class="btn btn-primary" data-action="sync-auth">${icon('sync', 16)} 执行增量同步</button>
          <span class="muted tiny">异常名单可核对后创建账号、绑定已有账号或标记处理</span>
        </div>
        ${sync.lastAt ? `<div class="sync-result">
          <div><span>新增账号</span><strong>${sync.created}</strong></div>
          <div><span>更新信息</span><strong>${sync.updated}</strong></div>
          <div><span>无变化</span><strong>${sync.skipped}</strong></div>
          <div><span>异常待处理</span><strong class="${exceptions.length ? 'danger-text' : ''}">${exceptions.length}</strong></div>
        </div>` : ''}
        ${exceptions.length ? `<div class="exception-list">
          <div class="exception-list-head"><h4>${icon('alert', 15)} 同步异常清单</h4><span class="chip chip-clay">${exceptions.length} 条待处理</span></div>
          ${exceptions.map((e) => `<div class="exception-item">
            <div class="exception-info">
              <strong>${esc(e.username)}${e.name ? ` · ${esc(e.name)}` : ''}</strong>
              <span>${esc(e.message)}</span>
              ${e.dept ? `<small>${esc(e.dept)}${e.role ? ' · 学生' : ''}</small>` : ''}
            </div>
            <button class="btn btn-primary btn-sm" data-action="open-auth-exception" data-username="${esc(e.username)}">${icon('edit', 14)} 核对并处理</button>
          </div>`).join('')}
        </div>` : sync.lastAt ? `<div class="notice notice-success" style="margin-top:16px">${icon('check', 19)}<div><strong>本次同步没有待处理异常</strong><p>新增与更新账号已完成；如后续再出现身份冲突，会重新出现在异常清单中。</p></div></div>` : ''}
        ${sync.handled ? `<p class="sync-handled">${icon('check', 14)} 已累计处理 ${sync.handled} 条认证异常</p>` : ''}
      </section>

      <section class="panel">
        ${sectionTitle('认证接口配置（只读）', '演示环境不发起真实网络请求', '')}
        <dl class="config-readonly">
          <div><dt>认证协议</dt><dd>CAS 3.0 / OAuth 2.0（模拟）</dd></div>
          <div><dt>接口地址</dt><dd class="mono">https://cas.example.edu.cn/api/v1</dd></div>
          <div><dt>同步模式</dt><dd>增量同步 · 每日 02:00 自动 / 手动触发</dd></div>
          <div><dt>唯一标识</dt><dd>学号 / 工号</dd></div>
          <div><dt>密码策略</dt><dd>由认证平台校验，本系统不存储密码</dd></div>
          <div><dt>调用状态</dt><dd><span class="status ${sync.lastAt ? 'status-free' : 'status-waiting'}"><i></i>${sync.lastAt ? '正常' : '未调用'}</span></dd></div>
        </dl>
        <div class="security-note">${icon('shield', 17)}<p>演示账号的固定密码仅用于本地体验；接入真实统一认证后，本系统只保存身份标识与角色权限，不接触、不存储认证密码。</p></div>
      </section>
    </div>

    ${resolvedEntries.length ? `<section class="panel resolved-panel">
      ${sectionTitle('已处理异常记录', '保留处理方式、操作人、时间与说明；再次同步不会重复上报', `<span class="chip chip-soft">${resolvedEntries.length} 条</span>`)}
      <div class="resolved-list">${resolvedEntries.map(([username, entry]) => {
        const linked = entry.userId ? state.users.find((u) => u.id === entry.userId) : null
        return `<div class="resolved-item">
          <span class="status status-free"><i></i>已处理</span>
          <div class="resolved-info">
            <strong>${esc(username)}${entry.identity ? ` · ${esc(entry.identity)}` : ''}</strong>
            <p>${esc(entry.note)}</p>
            <small>${esc(AUTH_MODE_LABELS[entry.mode] || entry.mode)}${linked ? ` · 关联账号 ${esc(linked.name)}（${esc(linked.username)}）` : ''} · ${String(entry.at || '').slice(0, 16)} · ${esc(entry.byName || '系统管理员')}</small>
          </div>
        </div>`
      }).join('')}</div>
    </section>` : ''}

    <section class="panel">
      ${sectionTitle('本次同步涉及的账号', '新同步账号默认启用，角色为学生', '')}
      ${created.length ? `<div class="sync-accounts">${created.map((u) => `<div class="sync-account"><span class="avatar avatar-green">${esc(u.name.slice(0, 1))}</span><div><strong>${esc(u.name)}</strong><small>${esc(u.username)} · ${esc(u.dept)}</small></div><span class="chip chip-soft">${esc(u.role === 'STUDENT' ? '学生' : roleLabel(u.role))}</span></div>`).join('')}</div>` : `<div class="notice notice-info">${icon('info', 18)}<div><p>执行同步后，新增的模拟校园账号会显示在此处。账号同步不会覆盖已有账号的角色与权限。</p></div></div>`}
    </section>`
}

export function renderSysConfig(ctx) {
  const { state } = ctx
  const c = state.config
  return `
    <div class="config-layout">
      <section class="panel">
        ${sectionTitle('系统基础配置', '修改后立即生效；变更前后值将写入操作日志', `<span class="chip chip-soft">仅系统管理员可操作</span>`)}
        <form data-form="config" class="config-form">
          <div class="config-grid">
            ${CONFIG_FIELDS.map((field) => `<label class="field"><span>${field.label}${field.unit ? ` <em>(${field.unit})</em>` : ''}</span>
              <input type="${field.type}" name="${field.key}" value="${esc(c[field.key])}" ${field.min != null ? `min="${field.min}"` : ''} ${field.max != null ? `max="${field.max}"` : ''} ${field.step != null ? `step="${field.step}"` : ''} required>
              ${field.hint ? `<small>${field.hint}</small>` : ''}
            </label>`).join('')}
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit">${icon('check', 16)} 保存配置</button>
            <button class="btn btn-ghost" type="button" data-action="reset-config-form">恢复当前值</button>
          </div>
        </form>
      </section>
      <aside class="config-aside">
        <section class="panel">
          ${sectionTitle('当前规则摘要', '页面展示与系统任务使用同一套参数', '')}
          <dl class="summary-list">
            <div><dt>可预约范围</dt><dd>今天起 ${c.advanceDays} 天</dd></div>
            <div><dt>单次时长</dt><dd>${c.minDuration}–${c.maxDuration} 分钟</dd></div>
            <div><dt>签到窗口</dt><dd>${c.checkinWindow} 分钟</dd></div>
            <div><dt>违约阈值</dt><dd>${c.violationThreshold} 次自动拉黑</dd></div>
            <div><dt>自动释放宽限</dt><dd>${c.autoReleaseDelay} 分钟</dd></div>
            <div><dt>登录锁定</dt><dd>${c.loginFailLimit} 次 / ${c.loginLockMinutes} 分钟</dd></div>
          </dl>
        </section>
        <section class="panel warning-panel">
          ${icon('alert', 22)}
          <h4>修改前请注意</h4>
          <p>签到窗口必须小于最短预约时长；违约阈值只决定系统自动加入黑名单，管理员不能手动加入。参数变更不会追溯修改已产生的预约。</p>
        </section>
      </aside>
    </div>`
}
