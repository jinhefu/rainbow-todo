const path = require('path')

const memory = {}
global.wx = {
  getStorageSync: function (key) {
    return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : ''
  },
  setStorageSync: function (key, value) {
    memory[key] = value
  },
  removeStorageSync: function (key) {
    delete memory[key]
  }
}

const dateUtil = require(path.join(__dirname, '..', 'utils', 'date.js'))
const colors = require(path.join(__dirname, '..', 'utils', 'colors.js'))
const store = require(path.join(__dirname, '..', 'utils', 'store.js'))
const format = require(path.join(__dirname, '..', 'utils', 'format.js'))
const taskUtil = require(path.join(__dirname, '..', 'utils', 'tasks.js'))
const statsUtil = require(path.join(__dirname, '..', 'utils', 'stats.js'))

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

function stamp(year, month, day, hour) {
  return new Date(year, month - 1, day, hour || 9, 0, 0).getTime()
}

function makeTask(overrides) {
  return Object.assign({
    id: 'id-' + Math.random().toString(36).slice(2, 8),
    title: '示例待办',
    note: '',
    color: '#FF6B6B',
    priority: 0,
    dueDate: '',
    done: false,
    createdAt: stamp(2026, 11, 15, 8),
    updatedAt: stamp(2026, 11, 15, 8),
    doneAt: null
  }, overrides || {})
}

console.log('')
console.log('彩虹待办 · 逻辑单元测试')
console.log('========================')

console.log('')
console.log('date 工具')
test('todayString 输出 ISO 日期', function () {
  ok(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dateUtil.todayString()), 'todayString format')
})
test('addDays 跨月与跨年', function () {
  eq(dateUtil.addDays('2026-01-31', 1), '2026-02-01')
  eq(dateUtil.addDays('2026-03-01', -1), '2026-02-28')
  eq(dateUtil.addDays('2026-12-31', 1), '2027-01-01')
  eq(dateUtil.addDays('2026-11-15', 7), '2026-11-22')
})
test('dayDiff 正负方向', function () {
  eq(dateUtil.dayDiff('2026-11-15', '2026-11-18'), 3)
  eq(dateUtil.dayDiff('2026-11-18', '2026-11-15'), -3)
  eq(dateUtil.dayDiff('2026-11-15', '2026-11-15'), 0)
})
test('relativeDueLabel 常用表达', function () {
  eq(dateUtil.relativeDueLabel('2026-11-15', '2026-11-15'), '今天')
  eq(dateUtil.relativeDueLabel('2026-11-16', '2026-11-15'), '明天')
  eq(dateUtil.relativeDueLabel('2026-11-17', '2026-11-15'), '后天')
  eq(dateUtil.relativeDueLabel('2026-11-14', '2026-11-15'), '昨天')
  eq(dateUtil.relativeDueLabel('2026-11-10', '2026-11-15'), '逾期 5 天')
  eq(dateUtil.relativeDueLabel('2026-11-20', '2026-11-15'), '5 天后')
  eq(dateUtil.relativeDueLabel('2026-12-20', '2026-11-15'), '12月20日')
  eq(dateUtil.relativeDueLabel('', '2026-11-15'), '')
})
test('friendlyDateLabel 与 weekday', function () {
  eq(dateUtil.friendlyDateLabel('2026-11-15'), '11月15日 周日')
  eq(dateUtil.shortWeekday('2026-11-15'), '日')
  eq(dateUtil.weekdayLabel('2026-11-09'), '周一')
})
test('greeting 时段问候', function () {
  eq(dateUtil.greeting(new Date(2026, 10, 15, 8)), '早上好')
  eq(dateUtil.greeting(new Date(2026, 10, 15, 13)), '中午好')
  eq(dateUtil.greeting(new Date(2026, 10, 15, 16)), '下午好')
  eq(dateUtil.greeting(new Date(2026, 10, 15, 20)), '晚上好')
  eq(dateUtil.greeting(new Date(2026, 10, 15, 23)), '夜深了')
})
test('isPastDate 只对过去返回 true', function () {
  ok(dateUtil.isPastDate('2026-11-14', '2026-11-15'))
  ok(!dateUtil.isPastDate('2026-11-15', '2026-11-15'))
  ok(!dateUtil.isPastDate('2026-11-16', '2026-11-15'))
})
test('dateOfTimestamp 取本地日期', function () {
  eq(dateUtil.dateOfTimestamp(stamp(2026, 11, 15, 10)), '2026-11-15')
})

console.log('')
console.log('colors 工具')
test('colorName 忽略大小写', function () {
  eq(colors.colorName('#4dabf7'), '晴空蓝')
  eq(colors.colorName('#FF6B6B'), '草莓红')
  eq(colors.colorName('#000000'), '彩虹色')
})
test('withAlpha 生成 rgba', function () {
  eq(colors.withAlpha('#FF6B6B', 0.14), 'rgba(255, 107, 107, 0.14)')
  eq(colors.withAlpha('bad', 0.2), 'rgba(255, 107, 107, 0.2)')
})

console.log('')
console.log('store 数据层')
test('初始为空数组', function () {
  resetStorage()
  eq(store.getTasks().length, 0)
})
test('addTask 规范化标题与字段', function () {
  resetStorage()
  const fixed = stamp(2026, 11, 15, 9)
  const task = store.addTask({ title: '  写周报  ', color: '#4DABF7', priority: 1, dueDate: '2026-11-16' }, fixed)
  ok(task && task.id, 'task id')
  eq(task.title, '写周报')
  eq(task.color, '#4DABF7')
  eq(task.priority, 1)
  eq(task.createdAt, fixed)
  eq(task.updatedAt, fixed)
  eq(task.done, false)
  eq(task.doneAt, null)
  eq(store.getTasks().length, 1)
  eq(store.getTasks()[0].title, '写周报')
})
test('空标题被拒绝', function () {
  resetStorage()
  eq(store.addTask({ title: '   ' }), null)
  eq(store.getTasks().length, 0)
})
test('越界优先级回落为 0', function () {
  resetStorage()
  store.addTask({ title: '优先级测试', priority: 9 }, stamp(2026, 11, 15, 9))
  eq(store.getTasks()[0].priority, 0)
})
test('toggleTask 写入 doneAt', function () {
  resetStorage()
  const task = store.addTask({ title: '打卡' }, stamp(2026, 11, 15, 8))
  const done = store.toggleTask(task.id, stamp(2026, 11, 15, 10))
  ok(done.done)
  eq(done.doneAt, stamp(2026, 11, 15, 10))
  const undone = store.toggleTask(task.id, stamp(2026, 11, 15, 11))
  ok(!undone.done)
  eq(undone.doneAt, null)
})
test('updateTask 修改字段并保留 createdAt', function () {
  resetStorage()
  const task = store.addTask({ title: '旧标题', priority: 0 }, stamp(2026, 11, 15, 8))
  const updated = store.updateTask(task.id, { title: '新标题', priority: 2, dueDate: '' }, stamp(2026, 11, 15, 12))
  eq(updated.title, '新标题')
  eq(updated.priority, 2)
  eq(updated.dueDate, '')
  eq(updated.createdAt, stamp(2026, 11, 15, 8))
  eq(updated.updatedAt, stamp(2026, 11, 15, 12))
})
test('removeTask 删除指定项', function () {
  resetStorage()
  const first = store.addTask({ title: 'A' }, stamp(2026, 11, 15, 8))
  store.addTask({ title: 'B' }, stamp(2026, 11, 15, 9))
  eq(store.removeTask(first.id), true)
  eq(store.getTasks().length, 1)
  eq(store.getTasks()[0].title, 'B')
  eq(store.removeTask('missing'), false)
})
test('clearCompleted 只清理已完成', function () {
  resetStorage()
  const a = store.addTask({ title: 'A' }, stamp(2026, 11, 15, 8))
  store.addTask({ title: 'B' }, stamp(2026, 11, 15, 9))
  store.toggleTask(a.id, stamp(2026, 11, 15, 10))
  eq(store.clearCompleted(), 1)
  eq(store.getTasks().length, 1)
  eq(store.getTasks()[0].title, 'B')
})
test('重复 id 与脏数据被过滤', function () {
  resetStorage()
  memory[store.TASKS_KEY] = [
    { id: 'x', title: 'A' },
    { id: 'x', title: '重复' },
    { id: '', title: '缺 id' },
    { title: '缺 id 2' },
    'not-a-task',
    null
  ]
  eq(store.getTasks().length, 1)
  memory[store.TASKS_KEY] = 'broken'
  eq(store.getTasks().length, 0)
})
test('设置项默认值与边界', function () {
  resetStorage()
  const defaults = store.getSettings()
  eq(defaults.nickname, '彩虹追梦人')
  eq(defaults.dailyGoal, 3)
  eq(defaults.celebrate, true)
  const saved = store.saveSettings({ nickname: '  小彩  ', dailyGoal: 5 })
  eq(saved.nickname, '小彩')
  eq(saved.dailyGoal, 5)
  eq(store.saveSettings({ dailyGoal: 99 }).dailyGoal, 3)
  eq(store.saveSettings({ dailyGoal: 0 }).dailyGoal, 3)
  eq(store.saveSettings({ nickname: '   ' }).nickname, '彩虹追梦人')
})
test('exportData 输出可解析 JSON', function () {
  resetStorage()
  store.addTask({ title: '导出我' }, stamp(2026, 11, 15, 8))
  const exported = JSON.parse(store.exportData())
  eq(exported.app, '彩虹待办')
  eq(exported.tasks.length, 1)
  eq(exported.tasks[0].title, '导出我')
})
test('resetAll 清空数据与设置', function () {
  resetStorage()
  store.addTask({ title: '清空我' }, stamp(2026, 11, 15, 8))
  store.resetAll()
  eq(store.getTasks().length, 0)
  eq(store.getSettings().nickname, '彩虹追梦人')
})

console.log('')
console.log('tasks 排序与过滤')
test('未完成排在前，逾期优先，无日期靠后', function () {
  const list = [
    makeTask({ id: 'done', title: '已完成', done: true, doneAt: stamp(2026, 11, 15, 9) }),
    makeTask({ id: 'nodate', title: '无日期' }),
    makeTask({ id: 'later', title: '稍后', dueDate: '2026-11-20' }),
    makeTask({ id: 'overdue', title: '逾期', dueDate: '2026-11-10' })
  ]
  const sorted = taskUtil.sortTasks(list)
  eq(sorted[0].id, 'overdue')
  eq(sorted[1].id, 'later')
  eq(sorted[2].id, 'nodate')
  eq(sorted[3].id, 'done')
})
test('同日期按优先级降序', function () {
  const list = [
    makeTask({ id: 'p0', priority: 0, dueDate: '2026-11-16' }),
    makeTask({ id: 'p2', priority: 2, dueDate: '2026-11-16' }),
    makeTask({ id: 'p1', priority: 1, dueDate: '2026-11-16' })
  ]
  const sorted = taskUtil.sortTasks(list)
  eq(sorted.map(function (task) { return task.id }).join(','), 'p2,p1,p0')
})
test('filterTasks 与 countTasks', function () {
  const list = [makeTask({ id: 'a' }), makeTask({ id: 'b', done: true })]
  eq(taskUtil.filterTasks(list, 'pending').length, 1)
  eq(taskUtil.filterTasks(list, 'done').length, 1)
  eq(taskUtil.filterTasks(list, 'all').length, 2)
  const counts = taskUtil.countTasks(list)
  eq(counts.all, 2)
  eq(counts.pending, 1)
  eq(counts.done, 1)
})

console.log('')
console.log('format 视图模型')
test('buildTaskView 生成展示字段', function () {
  const view = format.buildTaskView(makeTask({
    id: 'v1',
    title: '喝水',
    color: '#4DABF7',
    priority: 1,
    dueDate: '2026-11-15'
  }), '2026-11-15')
  eq(view.dueLabel, '今天')
  eq(view.overdue, false)
  eq(view.priorityLabel, '重要')
  eq(view.priorityClass, 'p1')
  eq(view.colorName, '晴空蓝')
  eq(view.softColor, 'rgba(77, 171, 247, 0.14)')
})
test('已完成任务显示已完成且不标记逾期', function () {
  const view = format.buildTaskView(makeTask({
    done: true,
    doneAt: stamp(2026, 11, 15, 10),
    dueDate: '2026-11-10'
  }), '2026-11-15')
  eq(view.dueLabel, '已完成')
  eq(view.overdue, false)
})

console.log('')
console.log('stats 统计')
test('computeStats 汇总正确', function () {
  const tasks = [
    makeTask({ id: 'a', done: true, doneAt: stamp(2026, 11, 15, 10), color: '#FF6B6B' }),
    makeTask({ id: 'b', done: true, doneAt: stamp(2026, 11, 14, 10), color: '#4DABF7' }),
    makeTask({ id: 'c', dueDate: '2026-11-15', color: '#FF6B6B' }),
    makeTask({ id: 'd', dueDate: '2026-11-10', color: '#51CF66' }),
    makeTask({ id: 'e', color: '#4DABF7' })
  ]
  const summary = statsUtil.computeStats(tasks, '2026-11-15', 3)
  eq(summary.total, 5)
  eq(summary.done, 2)
  eq(summary.pending, 3)
  eq(summary.doneToday, 1)
  eq(summary.dueToday, 1)
  eq(summary.overdue, 1)
  eq(summary.percent, 40)
  eq(summary.todayPercent, 33)
  eq(summary.weekDone, 2)
  eq(summary.streak, 2)
  eq(summary.weekSeries.length, 7)
  eq(summary.weekSeries[6].isToday, true)
  eq(summary.weekSeries[6].count, 1)
  eq(summary.weekSeries[5].count, 1)
  const red = summary.colorStats.filter(function (item) { return item.name === '草莓红' })[0]
  const blue = summary.colorStats.filter(function (item) { return item.name === '晴空蓝' })[0]
  eq(red.count, 2)
  eq(red.percent, 100)
  eq(blue.count, 2)
  eq(blue.percent, 100)
})
test('todayPercent 封顶 100', function () {
  const tasks = []
  for (let i = 0; i < 5; i++) {
    tasks.push(makeTask({ done: true, doneAt: stamp(2026, 11, 15, 10) }))
  }
  eq(statsUtil.computeStats(tasks, '2026-11-15', 2).todayPercent, 100)
})
test('streak 规则：昨天有记录仍可延续', function () {
  const onlyYesterday = statsUtil.computeStats([
    makeTask({ done: true, doneAt: stamp(2026, 11, 14, 10) })
  ], '2026-11-15', 3)
  eq(onlyYesterday.streak, 1)
  const twoDaysAgo = statsUtil.computeStats([
    makeTask({ done: true, doneAt: stamp(2026, 11, 13, 10) })
  ], '2026-11-15', 3)
  eq(twoDaysAgo.streak, 0)
  const consecutive = statsUtil.computeStats([
    makeTask({ done: true, doneAt: stamp(2026, 11, 15, 10) }),
    makeTask({ done: true, doneAt: stamp(2026, 11, 14, 10) }),
    makeTask({ done: true, doneAt: stamp(2026, 11, 13, 10) })
  ], '2026-11-15', 3)
  eq(consecutive.streak, 3)
})
test('空列表统计不崩溃', function () {
  const summary = statsUtil.computeStats([], '2026-11-15', 3)
  eq(summary.total, 0)
  eq(summary.percent, 0)
  eq(summary.todayPercent, 0)
  eq(summary.streak, 0)
  eq(summary.weekDone, 0)
})

console.log('')
console.log('========================')
console.log('通过 ' + passed + ' 项，失败 ' + failures.length + ' 项')
if (failures.length > 0) {
  console.log('失败用例：')
  for (let i = 0; i < failures.length; i++) console.log('  - ' + failures[i])
  process.exit(1)
}
