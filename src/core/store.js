import { STORAGE_KEY, isValidState, seedState } from './seed.js'

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

/**
 * 浏览器本地仓库。所有数据保存在 localStorage，不使用任何数据库或后端接口。
 * 提供注入 storage 的能力，便于在测试中替换。
 */
export function createStore(storage = window.localStorage, nowReal = () => Date.now()) {
  const key = STORAGE_KEY
  let recovered = false
  let state = null

  function readRaw() {
    try {
      return storage.getItem(key)
    } catch {
      throw new Error('浏览器禁止本地存储，请允许本站保存数据后重试。')
    }
  }

  function load() {
    if (state) return state
    const raw = readRaw()
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (isValidState(parsed)) {
          state = parsed
          return state
        }
      } catch {
        // 损坏的数据直接重建
      }
      recovered = true
    }
    state = seedState(nowReal())
    save()
    return state
  }

  function save() {
    if (!state) return
    try {
      storage.setItem(key, JSON.stringify(state))
    } catch {
      throw new Error('本地数据保存失败，请检查浏览器存储空间或隐私设置。')
    }
  }

  function reset() {
    state = seedState(nowReal())
    save()
    recovered = false
    return state
  }

  function replace(next) {
    if (!isValidState(next)) throw new Error('备份数据格式无效，未替换当前数据。')
    state = next
    save()
    recovered = false
    return state
  }

  function snapshot() {
    return clone(state)
  }

  return {
    get state() { return load() },
    load,
    save,
    reset,
    replace,
    snapshot,
    get recovered() { return recovered }
  }
}
