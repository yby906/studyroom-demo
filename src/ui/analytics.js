import { buildStats, roomOpenHours, roomSeatCount } from '../core/rules.js'
import { addDays, localDate } from '../core/time.js'
import { esc, icon, statCard, sectionTitle, lineChart, barChart, rankBar, heatmap, pct } from './components.js'

export function renderAnalytics(ctx) {
  const { state, now, ui } = ctx
  const today = localDate(now)
  const days = Number(ui.analyticsDays) || 7
  const from = addDays(today, -(days - 1))
  const roomId = Number(ui.analyticsRoomId) || 0
  const stats = buildStats(state, { from, to: today, roomId, now })
  const room = roomId ? state.rooms.find((r) => r.id === roomId) : null
  const trend = stats.byDay.map((d) => ({ label: d.date.slice(5), value: d.total }))
  const roomRank = stats.byRoom.filter((r) => r.enabled || r.total).map((r) => ({
    label: r.name, value: r.utilization, display: pct(r.utilization, 1)
  }))
  const statusRows = [
    { label: '已完成', value: stats.completed },
    { label: '已取消', value: stats.cancelled },
    { label: '已失约', value: stats.missed },
    { label: '待签到 / 使用中', value: stats.waiting + stats.checkedIn }
  ]
  const openRooms = state.rooms.filter((r) => r.enabled).length
  const seatCount = state.rooms.reduce((sum, r) => sum + roomSeatCount(state, r.id), 0)
  return `
    <div class="notice notice-info">${icon('eye', 19)}<div><strong>只读数据看板</strong><p>基于脱敏后的聚合预约数据生成，不展示学生个人明细，也不直接修改预约或座位数据。指标口径固定在页面下方。</p></div></div>

    <section class="panel analytics-filter">
      <div class="segmented">
        ${[[7, '近 7 天'], [14, '近 14 天'], [30, '近 30 天']].map(([value, label]) => `<button class="${days === value ? 'active' : ''}" data-action="set-analytics-days" data-days="${value}">${label}</button>`).join('')}
      </div>
      <label class="inline-field"><span>自习室</span><select data-bind="analyticsRoomId" data-type="number" data-refresh="analytics">
        <option value="0" ${roomId === 0 ? 'selected' : ''}>全部自习室</option>
        ${state.rooms.map((r) => `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${esc(r.name)}${r.enabled ? '' : '（停用）'}</option>`).join('')}
      </select></label>
      <div class="analytics-stamp">${icon('refresh', 14)} 数据更新于 ${stats.updatedAt.slice(0, 16)}</div>
    </section>

    <div class="stat-grid four">
      ${statCard({ label: '预约总量', value: stats.total, unit: '条', iconName: 'calendar', hint: `${from} 至 ${today}` })}
      ${statCard({ label: '签到率', value: pct(stats.checkinRate), iconName: 'check', tone: 'sage', hint: `已签到 ${stats.attended} 条` })}
      ${statCard({ label: '座位利用率', value: pct(stats.utilization), iconName: 'chart', tone: 'gold', hint: `${stats.bookedHours.toFixed(0)} 座位·小时` })}
      ${statCard({ label: '违约率', value: pct(stats.violationRate), iconName: 'alert', tone: stats.missed ? 'clay' : 'green', hint: `${stats.missed} 次超时未签到` })}
    </div>

    <div class="analytics-grid">
      <section class="panel">
        ${sectionTitle('预约需求趋势', `${room ? room.name : '全部自习室'} · 按预约日期统计`, `<span class="chip chip-soft">日均 ${(stats.total / Math.max(1, stats.range.days)).toFixed(1)} 条</span>`)}
        ${lineChart(trend, { unit: ' 条' })}
      </section>
      <section class="panel">
        ${sectionTitle('高峰时段分布', '按预约开始时间统计，辅助排班与开放时间调整', '')}
        ${barChart(stats.byHour, { label: '时段分布', unit: ' 条' })}
        <div class="chart-foot"><span>最高峰 <strong>${stats.peakHour}</strong></span><span>平均使用时长 <strong>${Math.round(stats.avgDuration)} 分钟</strong></span></div>
      </section>
    </div>

    <div class="analytics-grid">
      <section class="panel">
        ${sectionTitle('自习室利用率对比', '有效预约时长 ÷ 座位开放时长，仅统计已开放自习室', '')}
        ${roomRank.length ? rankBar(roomRank) : '<p class="muted">暂无数据</p>'}
        <div class="room-kpi-strip">
          ${stats.byRoom.filter((r) => r.enabled).map((r) => `<div><strong>${esc(r.name)}</strong><span>${r.total} 条预约 · ${roomSeatCount(state, r.roomId)} 座 · ${pct(r.utilization)}</span></div>`).join('')}
        </div>
      </section>
      <section class="panel">
        ${sectionTitle('预约状态构成', '用于判断失约与取消对资源的挤占程度', '')}
        ${rankBar(statusRows.map((row) => ({ label: row.label, value: row.value, display: row.value })), { unit: ' 条' })}
        <div class="mini-stats">
          <div><span>已完成</span><strong>${stats.completed}</strong></div>
          <div><span>已取消</span><strong>${stats.cancelled}</strong></div>
          <div><span>已失约</span><strong>${stats.missed}</strong></div>
        </div>
      </section>
    </div>

    <section class="panel">
      ${sectionTitle('周内 × 时段热度', '颜色越深表示预约越集中，可据此安排巡检与开放资源', `<span class="chip chip-soft">${stats.total} 条样本</span>`)}
      ${heatmap(stats.weekHeat, stats.heatRows, stats.heatCols)}
      <div class="heat-legend"><span>少</span><i></i><i></i><i></i><i></i><span>多</span></div>
    </section>

    <section class="panel">
      ${sectionTitle('空间运行概览', '开放自习室与座位资源', '')}
      <div class="overview-figures">
        <div><span>开放自习室</span><strong>${openRooms}<em>间</em></strong></div>
        <div><span>座位总数</span><strong>${seatCount}<em>个</em></strong></div>
        <div><span>平均开放时长</span><strong>${(state.rooms.reduce((sum, r) => sum + roomOpenHours(r), 0) / Math.max(1, state.rooms.length)).toFixed(1)}<em>小时/天</em></strong></div>
        <div><span>统计区间</span><strong class="small-figure">${from.slice(5)} – ${today.slice(5)}</strong></div>
      </div>
      <div class="metric-defs">
        <h4>指标口径说明</h4>
        <p><strong>签到率</strong> = 已签到预约数 ÷（已完成 + 使用中 + 已失约）。<strong>违约率</strong> = 已失约预约数 ÷ 预约总量。<strong>座位利用率</strong> = 有效预约时长 ÷（座位数 × 开放时长 × 统计天数），取消与失约预约不计入分子。</p>
      </div>
    </section>`
}
