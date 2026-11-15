const store = require('../../utils/store')
const format = require('../../utils/format')
const taskUtil = require('../../utils/tasks')
const statsUtil = require('../../utils/stats')
const dateUtil = require('../../utils/date')

const EMPTY_COPY = {
  all: { title: '还没有待办', sub: '点击右下角 +，写下第一件想做的事' },
  pending: { title: '没有未完成的待办', sub: '今天可以给自己一点小奖励' },
  done: { title: '还没有完成记录', sub: '完成一件小事，彩虹就会亮起来' }
}

Page({
  data: {
    today: '',
    dateLabel: '',
    greeting: '',
    nickname: '',
    filter: 'all',
    allTasks: [],
    visibleTasks: [],
    counts: { all: 0, pending: 0, done: 0 },
    stats: {},
    emptyTitle: EMPTY_COPY.all.title,
    emptySub: EMPTY_COPY.all.sub
  },

  onLoad: function () {
    this.refresh()
  },

  onShow: function () {
    this.refresh()
  },

  refresh: function () {
    const today = dateUtil.todayString()
    const tasks = store.getTasks()
    const settings = store.getSettings()
    const summary = statsUtil.computeStats(tasks, today, settings.dailyGoal)
    this.setData({
      today: today,
      dateLabel: dateUtil.friendlyDateLabel(today),
      greeting: dateUtil.greeting(),
      nickname: settings.nickname,
      allTasks: tasks,
      stats: summary,
      counts: taskUtil.countTasks(tasks)
    }, this.applyFilter.bind(this))
  },

  applyFilter: function () {
    const today = this.data.today
    const filter = this.data.filter
    const list = taskUtil.sortTasks(taskUtil.filterTasks(this.data.allTasks, filter))
    const copy = EMPTY_COPY[filter] || EMPTY_COPY.all
    this.setData({
      visibleTasks: format.buildTaskViews(list, today),
      emptyTitle: copy.title,
      emptySub: copy.sub
    })
  },

  onFilter: function (event) {
    const value = event.currentTarget.dataset.value
    if (value === this.data.filter) return
    this.setData({ filter: value }, this.applyFilter.bind(this))
  },

  onToggle: function (event) {
    const id = event.currentTarget.dataset.id
    const updated = store.toggleTask(id)
    if (updated && updated.done) {
      this.celebrate()
    }
    this.refresh()
  },

  celebrate: function () {
    const settings = store.getSettings()
    if (!settings.celebrate) return
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (error) {
      // 部分设备不支持震动，忽略即可
    }
    const tasks = store.getTasks()
    let pending = 0
    for (let i = 0; i < tasks.length; i++) {
      if (!tasks[i].done) pending += 1
    }
    if (tasks.length > 0 && pending === 0) {
      wx.showToast({ title: '全部完成，彩虹满分！', icon: 'none' })
    }
  },

  onOpen: function (event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/editor/editor?id=' + id })
  },

  onAdd: function () {
    wx.navigateTo({ url: '/pages/editor/editor' })
  },

  onLongPress: function (event) {
    const id = event.currentTarget.dataset.id
    const task = store.getTask(id)
    if (!task) return
    const self = this
    const labels = [task.done ? '标记为未完成' : '标记为完成', '编辑内容', '删除待办']
    wx.showActionSheet({
      itemList: labels,
      success: function (result) {
        if (result.tapIndex === 0) {
          store.setDone(id, !task.done)
          self.refresh()
        } else if (result.tapIndex === 1) {
          wx.navigateTo({ url: '/pages/editor/editor?id=' + id })
        } else if (result.tapIndex === 2) {
          self.confirmRemove(id)
        }
      }
    })
  },

  confirmRemove: function (id) {
    const self = this
    wx.showModal({
      title: '删除这条待办？',
      content: '删除后无法恢复，三思哦。',
      confirmText: '删除',
      confirmColor: '#ff6b6b',
      success: function (result) {
        if (!result.confirm) return
        store.removeTask(id)
        wx.showToast({ title: '已删除', icon: 'none' })
        self.refresh()
      }
    })
  }
})
