const path = require('path')

const memory = {}
const calls = {
  toasts: [],
  modals: [],
  actionSheets: [],
  navigations: [],
  titles: [],
  backCount: 0,
  clipboard: ''
}
let actionSheetIndex = 0

function resetCalls() {
  calls.toasts = []
  calls.modals = []
  calls.actionSheets = []
  calls.navigations = []
  calls.titles = []
  calls.backCount = 0
  calls.clipboard = ''
}

global.wx = {
  getStorageSync: function (key) {
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : ''
  },
  setStorageSync: function (key, value) {
    memory[key] = value
  },
  showToast: function (options) {
    calls.toasts.push(options)
  },
  showModal: function (options) {
    calls.modals.push(options)
    if (options.success) options.success({ confirm: true, cancel: false })
  },
  showActionSheet: function (options) {
    calls.actionSheets.push(options)
    if (options.success) options.success({ tapIndex: actionSheetIndex })
  },
  navigateTo: function (options) {
    calls.navigations.push(options.url)
  },
  navigateBack: function () {
    calls.backCount += 1
  },
  setNavigationBarTitle: function (options) {
    calls.titles.push(options.title)
  },
  vibrateShort: function () {},
  setClipboardData: function (options) {
    calls.clipboard = options.data
    if (options.success) options.success({})
  }
}

const store = require(path.join(__dirname, '..', 'utils', 'store.js'))
const dateUtil = require(path.join(__dirname, '..', 'utils', 'date.js'))

let passed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    passed += 1
    console.log('  ok   ' + name)
  } catch (error) {
    failures.push(name)
    console.log('  FAIL ' + name)
    console.log('       ' + error.message)
  }
}

function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error((label || 'value') + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual))
  }
}

function ok(value, label) {
  if (!value) throw new Error(label || 'expected a truthy value')
}

function resetStorage() {
  const keys = Object.keys(memory)
  for (let i = 0; i < keys.length; i++) delete memory[keys[i]]
}

function setByPath(target, keyPath, value) {
  const parts = keyPath.split('.')
  let cursor = target
  for (let i = 0; i < parts.length - 1; i++) {
    if (cursor[parts[i]] === undefined || cursor[parts[i]] === null) cursor[parts[i]] = {}
    cursor = cursor[parts[i]]
  }
  cursor[parts[parts.length - 1]] = value
}

function loadPage(rel) {
  const full = path.join(__dirname, '..', rel)
  delete require.cache[require.resolve(full)]
  let captured = null
  global.Page = function (config) {
    captured = config
  }
  require(full)
  if (!captured) throw new Error('Page() 未被调用: ' + rel)
  const instance = {}
  const keys = Object.keys(captured)
  for (let i = 0; i < keys.length; i++) instance[keys[i]] = captured[keys[i]]
  instance.data = captured.data ? JSON.parse(JSON.stringify(captured.data)) : {}
  instance.setData = function (patch, callback) {
    const patchKeys = Object.keys(patch)
    for (let i = 0; i < patchKeys.length; i++) {
      setByPath(instance.data, patchKeys[i], patch[patchKeys[i]])
    }
    if (typeof callback === 'function') callback.call(instance)
  }
  return instance
}

function lastToast() {
  return calls.toasts.length > 0 ? calls.toasts[calls.toasts.length - 1].title : ''
}

const today = dateUtil.todayString()
const tomorrow = dateUtil.addDays(today, 1)

console.log('')
console.log('彩虹待办 · 页面逻辑集成测试')
console.log('============================')

test('首页空状态渲染', function () {
  resetStorage()
  const page = loadPage('pages/index/index.js')
  page.onLoad()
  eq(page.data.visibleTasks.length, 0)
  eq(page.data.counts.all, 0)
  eq(page.data.stats.total, 0)
  eq(page.data.emptyTitle, '还没有待办')
  ok(page.data.dateLabel.length > 0, 'dateLabel')
})

test('新建待办的完整链路', function () {
  resetStorage()
  resetCalls()
  const page = loadPage('pages/editor/editor.js')
  page.onLoad({})
  eq(page.data.isEdit, false)
  eq(page.data.form.color, '#FF6B6B')

  page.onTitleInput({ detail: { value: '  整理书桌  ' } })
  page.onNoteInput({ detail: { value: '清掉过期杂志' } })
  page.onColor({ currentTarget: { dataset: { value: '#51CF66' } } })
  page.onPriority({ currentTarget: { dataset: { value: 2 } } })
  page.onQuickDate({ currentTarget: { dataset: { value: tomorrow } } })
  eq(page.data.activeColorName, '青草绿')
  eq(page.data.dueLabel, '明天')
  eq(page.data.form.priority, 2)

  page.onSave()
  const tasks = store.getTasks()
  eq(tasks.length, 1)
  eq(tasks[0].title, '整理书桌')
  eq(tasks[0].note, '清掉过期杂志')
  eq(tasks[0].color, '#51CF66')
  eq(tasks[0].priority, 2)
  eq(tasks[0].dueDate, tomorrow)
  eq(lastToast(), '已加入彩虹清单')
})

test('空标题不允许保存', function () {
  resetStorage()
  resetCalls()
  const page = loadPage('pages/editor/editor.js')
  page.onLoad({})
  page.onTitleInput({ detail: { value: '   ' } })
  page.onSave()
  eq(store.getTasks().length, 0)
  eq(lastToast(), '先写下要做什么吧')
})

test('首页列表与视图字段', function () {
  resetStorage()
  store.addTask({ title: '整理书桌', color: '#51CF66', priority: 2, dueDate: tomorrow })
  const page = loadPage('pages/index/index.js')
  page.onShow()
  eq(page.data.visibleTasks.length, 1)
  eq(page.data.visibleTasks[0].colorName, '青草绿')
  eq(page.data.visibleTasks[0].dueLabel, '明天')
  eq(page.data.visibleTasks[0].priorityLabel, '紧急')
  eq(page.data.counts.pending, 1)
})

test('勾选待办写入统计并触发庆祝', function () {
  resetStorage()
  store.addTask({ title: '唯一一件事' })
  const page = loadPage('pages/index/index.js')
  page.onShow()
  const id = store.getTasks()[0].id
  resetCalls()
  page.onToggle({ currentTarget: { dataset: { id: id } } })
  eq(store.getTasks()[0].done, true)
  eq(page.data.stats.doneToday, 1)
  ok(calls.toasts.some(function (toast) { return toast.title === '全部完成，彩虹满分！' }), '完成全部提示')
})

test('筛选切换只改变可见列表', function () {
  resetStorage()
  store.addTask({ title: 'A' })
  const done = store.addTask({ title: 'B' })
  store.toggleTask(done.id)
  const page = loadPage('pages/index/index.js')
  page.onShow()
  eq(page.data.visibleTasks.length, 2)
  page.onFilter({ currentTarget: { dataset: { value: 'pending' } } })
  eq(page.data.visibleTasks.length, 1)
  eq(page.data.visibleTasks[0].title, 'A')
  page.onFilter({ currentTarget: { dataset: { value: 'done' } } })
  eq(page.data.visibleTasks.length, 1)
  eq(page.data.visibleTasks[0].title, 'B')
  page.onFilter({ currentTarget: { dataset: { value: 'all' } } })
  eq(page.data.visibleTasks.length, 2)
})

test('长按操作：切换 / 编辑 / 删除', function () {
  resetStorage()
  store.addTask({ title: '长按测试' })
  const page = loadPage('pages/index/index.js')
  page.onShow()
  const id = store.getTasks()[0].id

  actionSheetIndex = 0
  page.onLongPress({ currentTarget: { dataset: { id: id } } })
  eq(store.getTasks()[0].done, true)

  actionSheetIndex = 0
  page.onLongPress({ currentTarget: { dataset: { id: id } } })
  eq(store.getTasks()[0].done, false)

  resetCalls()
  actionSheetIndex = 1
  page.onLongPress({ currentTarget: { dataset: { id: id } } })
  eq(calls.navigations[0], '/pages/editor/editor?id=' + id)

  actionSheetIndex = 2
  page.onLongPress({ currentTarget: { dataset: { id: id } } })
  eq(store.getTasks().length, 0)
})

test('新增按钮跳转编辑页', function () {
  resetCalls()
  const page = loadPage('pages/index/index.js')
  page.onLoad()
  page.onAdd()
  eq(calls.navigations[0], '/pages/editor/editor')
})

test('编辑已有待办并保存', function () {
  resetStorage()
  const task = store.addTask({ title: '旧标题', priority: 0 })
  resetCalls()
  const page = loadPage('pages/editor/editor.js')
  page.onLoad({ id: task.id })
  eq(page.data.isEdit, true)
  eq(page.data.form.title, '旧标题')
  eq(calls.titles[0], '编辑待办')

  page.onTitleInput({ detail: { value: '新标题' } })
  page.onPriority({ currentTarget: { dataset: { value: 1 } } })
  page.onQuickDate({ currentTarget: { dataset: { value: today } } })
  page.onSave()
  const saved = store.getTask(task.id)
  eq(saved.title, '新标题')
  eq(saved.priority, 1)
  eq(saved.dueDate, today)
  eq(lastToast(), '已更新')
})

test('编辑页删除待办', function () {
  resetStorage()
  const task = store.addTask({ title: '待删除' })
  const page = loadPage('pages/editor/editor.js')
  page.onLoad({ id: task.id })
  page.onDelete()
  eq(store.getTasks().length, 0)
})

test('未知 id 回落到新建模式', function () {
  resetStorage()
  const page = loadPage('pages/editor/editor.js')
  page.onLoad({ id: 'not-exist' })
  eq(page.data.isEdit, false)
  eq(page.data.form.title, '')
})

test('我的页：目标、昵称、开关', function () {
  resetStorage()
  store.addTask({ title: 'A' })
  const done = store.addTask({ title: 'B' })
  store.toggleTask(done.id)
  resetCalls()
  const page = loadPage('pages/mine/mine.js')
  page.onShow()
  eq(page.data.stats.total, 2)
  eq(page.data.stats.done, 1)

  page.onGoalStep({ currentTarget: { dataset: { delta: '1' } } })
  eq(page.data.settings.dailyGoal, 4)
  page.onGoalStep({ currentTarget: { dataset: { delta: '-1' } } })
  eq(page.data.settings.dailyGoal, 3)

  page.onNicknameBlur({ detail: { value: '  小彩虹  ' } })
  eq(store.getSettings().nickname, '小彩虹')
  page.onNicknameBlur({ detail: { value: '' } })
  eq(store.getSettings().nickname, '彩虹追梦人')

  page.onCelebrateChange({ detail: { value: false } })
  eq(store.getSettings().celebrate, false)
})

test('我的页：清理、导出、重置', function () {
  resetStorage()
  store.addTask({ title: 'A' })
  const done = store.addTask({ title: 'B' })
  store.toggleTask(done.id)
  const page = loadPage('pages/mine/mine.js')
  page.onShow()
  page.onClearCompleted()
  eq(store.getTasks().length, 1)
  eq(store.getTasks()[0].title, 'A')

  page.onExport()
  ok(calls.clipboard.indexOf('彩虹待办') >= 0, '导出的数据包含应用名')
  ok(calls.clipboard.indexOf('"tasks"') >= 0, '导出的数据包含任务')

  page.onReset()
  eq(store.getTasks().length, 0)
  eq(store.getSettings().nickname, '彩虹追梦人')

  page.onAbout()
  eq(calls.modals[calls.modals.length - 1].title, '关于彩虹待办')
})

test('统计页刷新', function () {
  resetStorage()
  store.addTask({ title: '统计项' })
  const page = loadPage('pages/stats/stats.js')
  page.onShow()
  eq(page.data.stats.total, 1)
  eq(page.data.stats.weekSeries.length, 7)
  ok(page.data.todayLabel.length > 0, 'todayLabel')
  ok(page.data.quote.length > 0, 'quote')
})

test('首页进度受每日目标影响', function () {
  resetStorage()
  store.saveSettings({ dailyGoal: 1 })
  const task = store.addTask({ title: '目标测试' })
  const page = loadPage('pages/index/index.js')
  page.onShow()
  eq(page.data.stats.todayPercent, 0)
  page.onToggle({ currentTarget: { dataset: { id: task.id } } })
  eq(page.data.stats.todayPercent, 100)
})

console.log('')
console.log('============================')
console.log('通过 ' + passed + ' 项，失败 ' + failures.length + ' 项')
if (failures.length > 0) {
  for (let i = 0; i < failures.length; i++) console.log('  - ' + failures[i])
  process.exit(1)
}
