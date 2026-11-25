#!/usr/bin/env node
/**
 * 静园 · 校园自习室预约管理系统
 * 零依赖本地静态服务器：node server.js
 * 仅提供静态文件，不连接数据库，不调用任何外部接口。
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const HOST = process.env.HOST || '127.0.0.1'
const START_PORT = Number(process.env.PORT) || 5173
const MAX_PORT = START_PORT + 40

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers
  })
  res.end(body)
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, 'Method Not Allowed')
    return
  }
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    send(res, 400, 'Bad Request')
    return
  }
  let filePath = pathname === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, pathname)
  const resolved = path.resolve(filePath)
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden')
    return
  }
  fs.stat(resolved, (err, stat) => {
    if (err || !stat.isFile()) {
      send(res, 404, '404 Not Found')
      return
    }
    const ext = path.extname(resolved).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store'
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    fs.createReadStream(resolved).pipe(res)
  })
})

let port = START_PORT
let attempts = 0

function openBrowser(url) {
  if (process.env.NO_OPEN === '1' || process.argv.includes('--no-open')) return
  try {
    if (process.platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref()
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
    }
  } catch {
    // 无法自动打开浏览器时，用户可手动访问控制台地址
  }
}

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE' && port < MAX_PORT) {
    port++
    attempts++
    server.listen(port, HOST)
    return
  }
  console.error('\n启动失败：' + error.message)
  process.exitCode = 1
})

server.on('listening', () => {
  const url = `http://${HOST}:${port}/`
  console.log('')
  console.log('  静园 · 校园自习室预约管理系统')
  console.log('  ─────────────────────────────')
  console.log(`  本地地址： ${url}`)
  console.log('  数据存储： 当前浏览器 localStorage（无数据库）')
  console.log('  停止服务： Ctrl + C')
  if (attempts > 0) console.log(`  （端口 ${START_PORT} 被占用，已改用 ${port}）`)
  console.log('')
  openBrowser(url)
})

server.listen(port, HOST)
