const colors = require('./colors')

const TASKS_KEY = 'rainbow_tasks_v1'
const SETTINGS_KEY = 'rainbow_settings_v1'

const DEFAULT_SETTINGS = {
  nickname: '彩虹追梦人',
  dailyGoal: 3,
  celebrate: true
}

let idSeed = 0

function hasWx() {
  return typeof wx !== 'undefined' && wx !== null
}

function readRaw(key, fallback) {
  if (!hasWx()) return fallback
  try {
    const value = wx.getStorageSync(key)
    if (value === '' || value === undefined || value === null) return fallback
    return value
  } catch (error) {
    return fallback
  }
}

function writeRaw(key, value) {
  if (!hasWx()) return false
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (error) {
    return false
  }
}

function createId() {
  idSeed = (idSeed + 1) % 1296
  return 't' + Date.now().toString(36) + idSeed.toString(36) + Math.floor(Math.random() * 1296).toString(36)
}

function normalizeTask(task, now) {
  const source = task || {}
  const stamp = typeof now === 'number' ? now : Date.now()
  const priority = parseInt(source.priority, 10)
  return {
    id: typeof source.id === 'string' && source.id ? source.id : createId(),
    title: typeof source.title === 'string' ? source.title.trim() : '',
    note: typeof source.note === 'string' ? source.note.trim() : '',
    color: source.color || colors.DEFAULT_COLOR,
    priority: priority === 1 || priority === 2 ? priority : 0,
    dueDate: typeof source.dueDate === 'string' ? source.dueDate : '',
    done: source.done === true,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : stamp,
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : stamp,
    doneAt: typeof source.doneAt === 'number' ? source.doneAt : null
  }
}

function isValidTask(task) {
  return !!task && typeof task === 'object' && typeof task.id === 'string' && task.id !== '' && typeof task.title === 'string'
}

function getTasks() {
  const raw = readRaw(TASKS_KEY, [])
  if (!Array.isArray(raw)) return []
  const seen = {}
  const tasks = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (!isValidTask(item)) continue
    if (seen[item.id]) continue
    seen[item.id] = true
    tasks.push(normalizeTask(item))
  }
  return tasks
}

function saveTasks(tasks) {
  writeRaw(TASKS_KEY, tasks)
  return tasks
}

function getTask(id) {
  const tasks = getTasks()
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id === id) return tasks[i]
  }
  return null
}

function addTask(input, now) {
  const task = normalizeTask(input, now)
  if (!task.title) return null
  const tasks = getTasks()
  tasks.unshift(task)
  saveTasks(tasks)
  return task
}

function updateTask(id, patch, now) {
  const tasks = getTasks()
  const stamp = typeof now === 'number' ? now : Date.now()
  const safe = patch || {}
  let found = null
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id !== id) continue
    const task = tasks[i]
    if (typeof safe.title === 'string') {
      const title = safe.title.trim()
      if (title) task.title = title
    }
    if (typeof safe.note === 'string') task.note = safe.note.trim()
    if (safe.color) task.color = safe.color
    const priority = parseInt(safe.priority, 10)
    if (priority === 0 || priority === 1 || priority === 2) task.priority = priority
    if (Object.prototype.hasOwnProperty.call(safe, 'dueDate')) {
      task.dueDate = typeof safe.dueDate === 'string' ? safe.dueDate : ''
    }
    task.updatedAt = stamp
    found = task
  }
  if (!found) return null
  saveTasks(tasks)
  return found
}

function setDone(id, done, now) {
  const tasks = getTasks()
  const stamp = typeof now === 'number' ? now : Date.now()
  let found = null
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id !== id) continue
    const task = tasks[i]
    task.done = done === true
    task.doneAt = task.done ? stamp : null
    task.updatedAt = stamp
    found = task
  }
  if (!found) return null
  saveTasks(tasks)
  return found
}

function toggleTask(id, now) {
  const task = getTask(id)
  if (!task) return null
  return setDone(id, !task.done, now)
}

function removeTask(id) {
  const tasks = getTasks()
  const next = []
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].id !== id) next.push(tasks[i])
  }
  if (next.length === tasks.length) return false
  saveTasks(next)
  return true
}

function clearCompleted() {
  const tasks = getTasks()
  const next = []
  for (let i = 0; i < tasks.length; i++) {
    if (!tasks[i].done) next.push(tasks[i])
  }
  const removed = tasks.length - next.length
  if (removed > 0) saveTasks(next)
  return removed
}

function clearAll() {
  const tasks = getTasks()
  saveTasks([])
  return tasks.length
}

function getSettings() {
  const raw = readRaw(SETTINGS_KEY, null)
  const settings = {
    nickname: DEFAULT_SETTINGS.nickname,
    dailyGoal: DEFAULT_SETTINGS.dailyGoal,
    celebrate: DEFAULT_SETTINGS.celebrate
  }
  if (raw && typeof raw === 'object') {
    if (typeof raw.nickname === 'string' && raw.nickname.trim()) settings.nickname = raw.nickname.trim()
    const goal = parseInt(raw.dailyGoal, 10)
    if (goal >= 1 && goal <= 20) settings.dailyGoal = goal
    if (typeof raw.celebrate === 'boolean') settings.celebrate = raw.celebrate
  }
  return settings
}

function saveSettings(patch) {
  const next = Object.assign(getSettings(), patch || {})
  if (typeof next.nickname !== 'string' || !next.nickname.trim()) next.nickname = DEFAULT_SETTINGS.nickname
  next.nickname = next.nickname.trim().slice(0, 12)
  if (next.nickname.length < 1) next.nickname = DEFAULT_SETTINGS.nickname
  const goal = parseInt(next.dailyGoal, 10)
  next.dailyGoal = goal >= 1 && goal <= 20 ? goal : DEFAULT_SETTINGS.dailyGoal
  next.celebrate = next.celebrate !== false
  writeRaw(SETTINGS_KEY, next)
  return next
}

function exportData() {
  return JSON.stringify({
    app: '彩虹待办',
    version: 1,
    exportedAt: Date.now(),
    tasks: getTasks(),
    settings: getSettings()
  }, null, 2)
}

function resetAll() {
  saveTasks([])
  writeRaw(SETTINGS_KEY, DEFAULT_SETTINGS)
  return true
}

module.exports = {
  TASKS_KEY: TASKS_KEY,
  SETTINGS_KEY: SETTINGS_KEY,
  DEFAULT_SETTINGS: DEFAULT_SETTINGS,
  getTasks: getTasks,
  saveTasks: saveTasks,
  getTask: getTask,
  addTask: addTask,
  updateTask: updateTask,
  setDone: setDone,
  toggleTask: toggleTask,
  removeTask: removeTask,
  clearCompleted: clearCompleted,
  clearAll: clearAll,
  getSettings: getSettings,
  saveSettings: saveSettings,
  exportData: exportData,
  resetAll: resetAll
}
