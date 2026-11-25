import { icon, logoMark } from './components.js'

const ACCOUNTS = [
  { username: 'student', role: '学生', name: '林一舟', icon: 'chair', tone: 'green' },
  { username: 'roomadmin', role: '自习室管理员', name: '王岚', icon: 'building', tone: 'clay' },
  { username: 'libadmin', role: '图书馆负责人', name: '李承泽', icon: 'chart', tone: 'blue' },
  { username: 'sysadmin', role: '系统管理员', name: '周明远', icon: 'settings', tone: 'gold' }
]

function seatDots() {
  let cells = ''
  for (let i = 0; i < 30; i++) {
    const picked = [3, 7, 12, 16, 21, 25].includes(i)
    const off = [9, 22].includes(i)
    cells += `<i class="${picked ? 'picked' : ''} ${off ? 'off' : ''}"></i>`
  }
  return cells
}

export function loginPage() {
  return `<div class="login-page">
    <section class="login-visual">
      <div class="login-brand">${logoMark(38)}<span>静园<small>CAMPUS STUDY ROOM</small></span></div>
      <div class="login-copy">
        <span class="eyebrow light">MAKE ROOM FOR FOCUS</span>
        <h1>为专注，<br><em>留一个位置。</em></h1>
        <p>从查询一间自习室开始，到离场签退结束。<br>让每一次预约，都成为认真学习的起点。</p>
        <div class="login-points">
          <span>${icon('calendar', 16)} 自由时段预约</span>
          <span>${icon('shield', 16)} 违约与黑名单管理</span>
          <span>${icon('chart', 16)} 使用数据分析</span>
        </div>
      </div>
      <div class="visual-board" aria-hidden="true">
        <div class="board-head"><span>LIBRARY · STUDY SPACE</span><span class="live"><i></i>OPEN</span></div>
        <div class="hero-seats">${seatDots()}</div>
        <div class="board-legend"><span><i class="free"></i>空闲</span><span><i class="busy"></i>已预约</span><span><i class="used"></i>使用中</span></div>
        <div class="floating-card card-b">${icon('clock', 16)}<div><strong>15 分钟</strong><span>签到窗口</span></div></div>
      </div>
    </section>

    <section class="login-panel">
      <div class="login-box">
        <span class="eyebrow green">WELCOME BACK</span>
        <h2>登录自习空间</h2>
        <form data-form="login" class="login-form" novalidate>
          <label class="field"><span>账号</span>
            <div class="input-with-icon">${icon('user', 17)}<input name="username" type="text" autocomplete="username" placeholder="请输入账号" maxlength="30" required></div>
          </label>
          <label class="field"><span>密码</span>
            <div class="input-with-icon">${icon('lock', 17)}<input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required></div>
          </label>
          <p class="form-error" data-login-error hidden></p>
          <button class="btn btn-primary btn-full btn-lg" type="submit">登录学习空间 ${icon('arrow', 17)}</button>
          <div class="register-row"><span>还没有账号？</span><button type="button" class="register-link" data-action="open-register">注册新用户 ${icon('arrow', 13)}</button></div>
        </form>

        <div class="quick-login">
          <span class="quick-label">快捷登录</span>
          <div class="demo-accounts">
            ${ACCOUNTS.map((account) => `<button class="demo-account" data-action="quick-login" data-username="${account.username}" type="button">
              <span class="demo-avatar tone-${account.tone}">${icon(account.icon, 17)}</span>
              <span><strong>${account.name}</strong><small>${account.role}</small></span>
              ${icon('arrow', 14)}
            </button>`).join('')}
          </div>
        </div>
      </div>
    </section>
  </div>`
}
