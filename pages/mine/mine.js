const store = require('../../utils/store')
const statsUtil = require('../../utils/stats')
const dateUtil = require('../../utils/date')

Page({
  data: {
    settings: {},
    stats: {}
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
    this.setData({
      settings: settings,
      stats: statsUtil.computeStats(tasks, today, settings.dailyGoal)
    })
  },

  onNicknameInput: function (event) {
    this.setData({ 'settings.nickname': event.detail.value })
  },

  onNicknameBlur: function (event) {
    const settings = store.saveSettings({ nickname: event.detail.value })
    this.setData({ settings: settings })
  },

  onGoalStep: function (event) {
    const delta = parseInt(event.currentTarget.dataset.delta, 10)
    const current = this.data.settings.dailyGoal
    const goal = Math.min(10, Math.max(1, current + delta))
    const settings = store.saveSettings({ dailyGoal: goal })
    this.setData({ settings: settings })
  },

  onCelebrateChange: function (event) {
    const settings = store.saveSettings({ celebrate: event.detail.value })
    this.setData({ settings: settings })
  },

  onClearCompleted: function () {
    const self = this
    const done = this.data.stats.done
    if (!done) {
      wx.showToast({ title: '还没有已完成的待办', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清理已完成待办？',
      content: '将删除 ' + done + ' 条已完成记录。',
      confirmText: '清理',
      confirmColor: '#ff6b6b',
      success: function (result) {
        if (!result.confirm) return
        const removed = store.clearCompleted()
        wx.showToast({ title: '已清理 ' + removed + ' 条', icon: 'none' })
        self.refresh()
      }
    })
  },

  onExport: function () {
    const data = store.exportData()
    wx.setClipboardData({ data: data })
  },

  onReset: function () {
    const self = this
    wx.showModal({
      title: '清空所有数据？',
      content: '待办、昵称与每日目标都会重置，操作不可撤销。',
      confirmText: '清空',
      confirmColor: '#ff6b6b',
      success: function (result) {
        if (!result.confirm) return
        store.resetAll()
        self.refresh()
        wx.showToast({ title: '已重置', icon: 'none' })
      }
    })
  },

  onAbout: function () {
    wx.showModal({
      title: '关于彩虹待办',
      content: '彩虹待办 v1.0.0\n用彩虹色给生活分类，用勾选记录进步。\n所有数据仅保存在本机微信中。',
      showCancel: false,
      confirmText: '好的'
    })
  }
})
