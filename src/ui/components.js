import qrcode from '../vendor/qrcode.js'

const ICONS = {  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 17.5h2"/>',
  chair: '<path d="M6 12V4h12v8"/><path d="M4 12h16v5H4z"/><path d="M6 17v4M18 17v4"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16 4.8a3.4 3.4 0 0 1 0 6.4M18 14a5.5 5.5 0 0 1 3.2 5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.16.39.5.7.92.86H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.14z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  pin: '<path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3L2 21h20L12 3z"/><path d="M12 9v5M12 17.5h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8"/><path d="M21 3v5h-5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10M2 21h20"/><path d="M8 7h2M8 11h2M8 15h2M12 7h1M12 11h1M12 15h1"/>',
  door: '<path d="M4 21h16M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M14 12h.01"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  power: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>',
  activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  spark: '<path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2z"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><path d="M12 19.5h.01"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M20 20h1M14 20h3"/>',
  upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M4 3h16"/>'
}

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
}

export function icon(name, size = 18, extraClass = '') {
  const body = ICONS[name] || ICONS.info
  return `<svg class="icon ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

export function logoMark(size = 34) {
  return `<span class="logo-mark" style="width:${size}px;height:${size}px">
    <svg width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13z"/>
      <path d="M8 8h8M8 12h6"/>
      <path d="M17 3v18"/>
    </svg>
  </span>`
}

export function statusBadge(status, label) {
  const text = label || ({ WAITING: '待签到', CHECKED_IN: '使用中', COMPLETED: '已完成', CANCELLED: '已取消', MISSED: '已失约' }[status] || status)
  return `<span class="status status-${String(status).toLowerCase()}"><i></i>${text}</span>`
}

export function roleBadge(role) {
  const labels = { STUDENT: '学生', ROOM_ADMIN: '自习室管理员', LIB_ADMIN: '图书馆负责人', SYS_ADMIN: '系统管理员' }
  return `<span class="role-chip role-${String(role).toLowerCase()}">${labels[role] || role}</span>`
}

export function avatar(name = '', role = 'STUDENT') {
  const char = String(name || '?').slice(0, 1)
  const tone = role === 'SYS_ADMIN' ? 'gold' : role === 'ROOM_ADMIN' ? 'clay' : role === 'LIB_ADMIN' ? 'blue' : 'green'
  return `<span class="avatar avatar-${tone}">${char}</span>`
}

export function statCard({ label, value, unit = '', iconName = 'activity', hint = '', tone = 'green', trend = '' }) {
  return `<article class="stat-card tone-${tone}">
    <div class="stat-top"><span>${label}</span><span class="stat-icon">${icon(iconName, 19)}</span></div>
    <div class="stat-value">${value}${unit ? `<em>${unit}</em>` : ''}</div>
    <div class="stat-foot">${trend ? `<span class="trend">${trend}</span>` : ''}${hint ? `<span>${hint}</span>` : ''}</div>
  </article>`
}

export function sectionTitle(title, desc = '', action = '') {
  return `<div class="section-title"><div><h3>${title}</h3>${desc ? `<p>${desc}</p>` : ''}</div>${action ? `<div class="section-action">${action}</div>` : ''}</div>`
}

export function emptyState({ iconName = 'info', title = '暂无数据', text = '', action = '' }) {
  return `<div class="empty-state"><span class="empty-icon">${icon(iconName, 30)}</span><h4>${title}</h4>${text ? `<p>${text}</p>` : ''}${action}</div>`
}

export function pct(value, digits = 1) {  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return `${(num * 100).toFixed(digits)}%`
}

export function number(value) {
  return new Intl.NumberFormat('zh-CN').format(Number(value) || 0)
}

let chartSeed = 0

export function lineChart(data, options = {}) {
  const width = 640
  const height = 220
  const pad = { top: 18, right: 16, bottom: 30, left: 34 }
  const values = data.map((d) => Number(d.value) || 0)
  const max = Math.max(1, ...values)
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0
  const points = data.map((d, i) => {
    const x = pad.left + i * stepX
    const y = pad.top + innerH - (Number(d.value) || 0) / max * innerH
    return { x, y, ...d }
  })
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${points[points.length - 1]?.x || pad.left},${pad.top + innerH} L${pad.left},${pad.top + innerH} Z`
  const id = `grad-${++chartSeed}`
  const xLabels = points.map((p, i) => {
    if (data.length <= 8 || i === 0 || i === data.length - 1 || i % Math.ceil(data.length / 6) === 0) {
      return `<text x="${p.x}" y="${height - 8}" text-anchor="middle">${p.label}</text>`
    }
    return ''
  }).join('')
  const yLabels = [0, 0.5, 1].map((ratio) => {
    const y = pad.top + innerH - ratio * innerH
    return `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" class="grid-line"/>
      <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end">${Math.round(max * ratio)}</text>`
  }).join('')
  return `<div class="line-chart" role="img" aria-label="趋势图">
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2f7a5f" stop-opacity=".26"/>
        <stop offset="100%" stop-color="#2f7a5f" stop-opacity="0"/>
      </linearGradient></defs>
      ${yLabels}
      <path d="${area}" fill="url(#${id})"/>
      <path d="${line}" class="trend-line"/>
      ${points.map((p) => `<g><circle cx="${p.x}" cy="${p.y}" r="3.4" class="trend-dot"><title>${p.label}：${p.value}${options.unit || ''}</title></circle></g>`).join('')}
      ${xLabels}
    </svg>
  </div>`
}

export function barChart(data, options = {}) {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0))
  return `<div class="bar-chart ${data.length > 14 ? 'dense' : ''}" role="img" aria-label="${options.label || '柱状图'}">
    ${data.map((d) => {
      const value = Number(d.value) || 0
      return `<div class="bar-col" title="${d.label}：${value}${options.unit || ''}">
        <span class="bar-value">${value}</span>
        <div class="bar-track"><span class="bar-fill" style="height:${Math.max(3, value / max * 100)}%"></span></div>
        <span class="bar-label">${d.label}</span>
      </div>`
    }).join('')}
  </div>`
}

export function rankBar(rows, options = {}) {
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0))
  return `<div class="rank-list">${rows.map((row) => `
    <div class="rank-row">
      <span class="rank-label">${row.label}</span>
      <div class="rank-track"><span style="width:${Math.max(2, (Number(row.value) || 0) / max * 100)}%"></span></div>
      <span class="rank-value">${row.display ?? row.value}${options.unit || ''}</span>
    </div>`).join('')}</div>`
}

export function heatmap(matrix, rows, cols) {
  const max = Math.max(1, ...matrix.flat())
  return `<div class="heatmap">
    <div class="heat-row heat-head"><span></span>${cols.map((c) => `<span>${c}</span>`).join('')}</div>
    ${rows.map((row, r) => `<div class="heat-row"><span class="heat-label">${row}</span>
      ${cols.map((_, c) => {
        const value = matrix[r]?.[c] || 0
        const alpha = value ? 0.16 + (value / max) * 0.74 : 0.04
        return `<span class="heat-cell" style="--alpha:${alpha}" title="${row} ${cols[c]}：${value} 次">${value || ''}</span>`
      }).join('')}
    </div>`).join('')}
  </div>`
}

export function progress(value, label = '') {
  const v = Math.max(0, Math.min(1, Number(value) || 0))
  return `<div class="progress-wrap"><div class="progress"><span style="width:${v * 100}%"></span></div>${label ? `<small>${label}</small>` : ''}</div>`
}

export function field({ label, name, type = 'text', value = '', placeholder = '', required = false, hint = '', options = null, min, max, step, attrs = '' }) {
  if (options) {
    return `<label class="field"><span>${label}</span>
      <select name="${name}" ${required ? 'required' : ''} ${attrs}>
        ${options.map((o) => `<option value="${o.value}" ${String(o.value) === String(value) ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>${hint ? `<small>${hint}</small>` : ''}</label>`
  }
  if (type === 'textarea') {
    return `<label class="field"><span>${label}</span><textarea name="${name}" rows="3" placeholder="${placeholder}" ${required ? 'required' : ''} ${attrs}>${value}</textarea>${hint ? `<small>${hint}</small>` : ''}</label>`
  }
  return `<label class="field"><span>${label}</span>
    <input type="${type}" name="${name}" value="${value ?? ''}" placeholder="${placeholder}" ${required ? 'required' : ''}
      ${min != null ? `min="${min}"` : ''} ${max != null ? `max="${max}"` : ''} ${step != null ? `step="${step}"` : ''} ${attrs}>
    ${hint ? `<small>${hint}</small>` : ''}</label>`
}

export function chip(text, tone = '') {
  return `<span class="chip ${tone ? `chip-${tone}` : ''}">${text}</span>`
}

/** 生成真实可扫描的二维码 SVG（本地内置 qrcode-generator，无网络请求） */
export function qrSvg(text, { cellSize = 5, margin = 4 } = {}) {
  try {
    const qr = qrcode(0, 'M')
    qr.addData(String(text))
    qr.make()
    return qr.createSvgTag(cellSize, margin, '座位签到二维码', '座位签到二维码')
  } catch {
    return '<div class="qr-fallback">二维码生成失败</div>'
  }
}
