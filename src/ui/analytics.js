import { buildStats, collegeShort, roomOpenHours, roomSeatCount } from '../core/rules.js'
import { addDays, localDate } from '../core/time.js'
import { esc, icon, statCard, sectionTitle, lineChart, barChart, rankBar, heatmap, pct, donutChart } from './components.js'

export function renderAnalytics(ctx) {
  const { state, now, ui } = ctx
  const today = localDate(now)
  const days = Number(ui.analyticsDays) || 7
  const from = addDays(today, -(days - 1))
  const roomId = Number(ui.analyticsRoomId) || 0
  const college = ui.analyticsCollege || 'ALL'
  const stats = buildStats(state, { from, to: today, roomId, college, now })
  const room = roomId ? state.rooms.find((r) => r.id === roomId) : null
  const trend = stats.byDay.map((d) => ({ label: d.date.slice(5), value: d.total }))
  const roomRank = stats.byRoom.filter((r) => r.enabled || r.total).map((r) => ({
    label: r.name, value: r.utilization, display: pct(r.utilization, 1)
  }))
  const collegeDonut = stats.byCollege.map((c) => ({ label: collegeShort(c.college), value: c.total }))
  const collegeRank = stats.byCollege.map((c) => ({ label: c.short, value: c.checkinRate, display: pct(c.checkinRate, 1) }))
  const classRank = stats.byClass.slice(0, 8).map((c) => ({
    label: `${collegeShort(c.college)} · ${c.className}`, value: c.total, display: `${c.total} 条 · 签到 ${pct(c.checkinRate, 0)}`
  }))
  const statusRows = [
    { label: '已完成', value: stats.completed },
    { label: '使用中', value: stats.checkedIn },
    { label: '待签到', value: stats.waiting },
    { label: '已取消', value: stats.cancelled },
    { label: '已失约', value: stats.missed }
  ]
  const proxyCount = state.bookings.filter((b) =>
    b.proxy && b.date >= from && b.date <= today && (!roomId || b.roomId === roomId) &&
    (college === 'ALL' || collegeOfBooking(state, b) === college)
  ).length
  const openRooms = state.rooms.filter((r) => r.enabled).length
  const seatCount = state.rooms.reduce((sum, r) => sum + roomSeatCount(state, r.id), 0)
  const collegeLabel = college === 'ALL' ? '全部学院' : college
  return `
    <div class="notice notice-info">${icon('eye', 19)}<div><strong>只读数据看板</strong><p>基于脱敏后的聚合预约数据生成，不展示学生个人明细，也不直接修改预约或座位数据。新增学院维度，可按学院筛选并下钻到班级。</p></div></div>

    <section class="panel analytics-filter">
      <div class="segmented">
        ${[[7, '近 7 天'], [14, '近 14 天'], [30, '近 30 天']].map(([value, label]) => `<button class="${days === value ? 'active' : ''}" data-action="set-analytics-days" data-days="${value}">${label}</button>`).join('')}
      </div>
      <label class="inline-field"><span>自习室</span><select data-bind="analyticsRoomId" data-type="number" data-refresh="analytics">
        <option value="0" ${roomId === 0 ? 'selected' : ''}>全部自习室</option>
        ${state.rooms.map((r) => `<option value="${r.id}" ${r.id === roomId ? 'selected' : ''}>${esc(r.name)}${r.enabled ? '' : '（停用）'}</option>`).join('')}
      </select></label>
      <label class="inline-field"><span>学院</span><select data-bind="analyticsCollege" data-refresh="analytics">
        <option value="ALL" ${college === 'ALL' ? 'selected' : ''}>全部学院</option>
        ${stats.colleges.map((c) => `<option value="${esc(c)}" ${c === college ? 'selected' : ''}>${esc(c)}</option>`).join('')}
      </select></label>
      <div class="filter-spacer"></div>
      <button class="btn btn-ghost btn-sm" data-action="export-college">${icon('graduation', 15)} 导出学院统计</button>
      <div class="analytics-stamp">${icon('refresh', 14)} 数据更新于 ${stats.updatedAt.slice(0, 16)}</div>
    </section>

    <div class="stat-grid four">
      ${statCard({ label: '预约总量', value: stats.total, unit: '条', iconName: 'calendar', hint: `${from} 至 ${today} · ${collegeLabel}` })}
      ${statCard({ label: '签到率', value: pct(stats.checkinRate), iconName: 'check', tone: 'sage', hint: `已签到 ${stats.attended} 条` })}
      ${statCard({ label: '座位利用率', value: pct(stats.utilization), iconName: 'chart', tone: 'gold', hint: `${stats.bookedHours.toFixed(0)} 座位·小时` })}
      ${statCard({ label: '违约率', value: pct(stats.violationRate), iconName: 'alert', tone: stats.missed ? 'clay' : 'green', hint: `${stats.missed} 次超时未签到` })}
    </div>

    <div class="analytics-grid">
      <section class="panel">
        ${sectionTitle('预约需求趋势', `${room ? room.name : '全部自习室'} · ${collegeLabel} · 按预约日期统计`, `<span class="chip chip-soft">日均 ${(stats.total / Math.max(1, stats.range.days)).toFixed(1)} 条</span>`)}
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
        ${sectionTitle('学院预约分布', '按学生所属学院统计预约量，快速识别需求集中学院', `<span class="chip chip-soft">${stats.byCollege.length} 个学院</span>`)}
        ${collegeDonut.length ? donutChart(collegeDonut, { unit: ' 条', label: '学院预约分布' }) : '<p class="muted">暂无学院数据</p>'}
      </section>
      <section class="panel">
        ${sectionTitle('学院签到率对比', '签到率 = 已签到 ÷（已完成 + 使用中 + 已失约）', '')}
        ${collegeRank.length ? rankBar(collegeRank) : '<p class="muted">暂无数据</p>'}
        <div class="chart-foot"><span>违约合计 <strong>${stats.missed} 次</strong></span><span>取消合计 <strong>${stats.cancelled} 条</strong></span><span>管理员代订 <strong>${proxyCount} 条</strong></span></div>
      </section>
    </div>

    <section class="panel">
      ${sectionTitle('学院统计明细', college === 'ALL' ? '点击行内“筛选”可只看该学院；也可导出学院/班级 CSV' : `当前仅显示 ${esc(college)}，点击“全部学院”恢复`, `<button class="btn btn-ghost btn-sm" data-action="export-class">${icon('graduation', 15)} 导出班级明细</button>`)}
      ${stats.byCollege.length ? `<div class="table-wrap"><table class="data-table">
        <thead><tr><th>学院</th><th>学生数</th><th>预约量</th><th>签到量</th><th>签到率</th><th>违约率</th><th>座位利用率</th><th>占全部预约</th><th class="align-right">操作</th></tr></thead>
        <tbody>${stats.byCollege.map((c) => `<tr>
          <td><div class="cell-main"><strong>${esc(c.college)}</strong><small>${esc(c.short)} · ${c.hours.toFixed(0)} 座位·小时</small></div></td>
          <td>${c.students}</td><td>${c.total}</td><td>${c.attended}</td>
          <td>${pct(c.checkinRate)}</td><td>${pct(c.violationRate)}</td><td>${pct(c.utilization)}</td>
          <td>${pct(c.share)}</td>
          <td class="align-right"><button class="btn btn-ghost btn-xs" data-action="set-analytics-college" data-college="${esc(c.college)}">${icon('filter', 12)} 筛选</button></td>
        </tr>`).join('')}</tbody>
      </table></div>` : '<p class="muted">所选范围暂无学院数据。</p>'}
      <div class="mini-stats">
        <div><span>覆盖学院</span><strong>${stats.byCollege.length}</strong></div>
        <div><span>覆盖学生</span><strong>${stats.byCollege.reduce((sum, c) => sum + c.students, 0)}</strong></div>
        <div><span>班级数</span><strong>${stats.byClass.length}</strong></div>
      </div>
    </section>

    <div class="analytics-grid">
      <section class="panel">
        ${sectionTitle('班级预约 TOP 8', '按预约量取前 8 个班级，辅助辅导员了解自习需求', '')}
        ${classRank.length ? rankBar(classRank, { unit: '' }) : '<p class="muted">暂无班级数据</p>'}
      </section>
      <section class="panel">
        ${sectionTitle('预约状态构成', '用于判断失约与取消对资源的挤占程度', '')}
        ${donutChart(statusRows, { unit: ' 条', label: '预约状态构成' })}
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
        ${sectionTitle('周内 × 时段热度', '颜色越深表示预约越集中，可据此安排巡检与开放资源', `<span class="chip chip-soft">${stats.total} 条样本</span>`)}
        ${heatmap(stats.weekHeat, stats.heatRows, stats.heatCols)}
        <div class="heat-legend"><span>少</span><i></i><i></i><i></i><i></i><span>多</span></div>
      </section>
    </div>

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
        <p><strong>签到率</strong> = 已签到预约数 ÷（已完成 + 使用中 + 已失约）。<strong>违约率</strong> = 已失约预约数 ÷ 预约总量。<strong>座位利用率</strong> = 有效预约时长 ÷（座位数 × 开放时长 × 统计天数），取消与失约预约不计入分子。<strong>学院口径</strong> = 预约学生当前所属学院；管理员代订同样计入学生所属学院。</p>
      </div>
    </section>`
}

function collegeOfBooking(state, booking) {
  const user = state.users.find((u) => u.id === booking.userId)
  return user?.college || '未分配学院'
}
