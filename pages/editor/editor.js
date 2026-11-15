const store = require('../../utils/store')
const colors = require('../../utils/colors')
const dateUtil = require('../../utils/date')

const PRIORITIES = [
  { value: 0, label: '普通' },
  { value: 1, label: '重要' },
  { value: 2, label: '紧急' }
]

Page({
  data: {
    isEdit: false,
    taskId: '',
    palette: colors.PALETTE,
    priorities: PRIORITIES,
    quickDates: [],
    today: '',
    pickerValue: '',
    activeColorName: colors.PALETTE[0].name,
    dueLabel: '',
    customDate: false,
    form: {
      title: '',
      note: '',
      color: colors.DEFAULT_COLOR,
      priority: 0,
      dueDate: ''
    }
  },

  onLoad: function (query) {
    const today = dateUtil.todayString()
    const quickDates = [
      { label: '今天', value: today },
      { label: '明天', value: dateUtil.addDays(today, 1) },
      { label: '后天', value: dateUtil.addDays(today, 2) }
    ]
    const base = {
      today: today,
      quickDates: quickDates,
      pickerValue: today
    }

    if (query && query.id) {
      const task = store.getTask(query.id)
      if (task) {
        this.setData(Object.assign(base, {
          isEdit: true,
          taskId: task.id,
          form: {
            title: task.title,
            note: task.note,
            color: task.color,
            priority: task.priority,
            dueDate: task.dueDate
          }
        }), this.refreshPreview.bind(this))
        wx.setNavigationBarTitle({ title: '编辑待办' })
        return
      }
    }

    this.setData(base, this.refreshPreview.bind(this))
    wx.setNavigationBarTitle({ title: '新的待办' })
  },

  refreshPreview: function () {
    const form = this.data.form
    const today = this.data.today
    let customDate = !!form.dueDate
    const quickDates = this.data.quickDates
    for (let i = 0; i < quickDates.length; i++) {
      if (quickDates[i].value === form.dueDate) customDate = false
    }
    this.setData({
      activeColorName: colors.colorName(form.color),
      dueLabel: form.dueDate ? dateUtil.relativeDueLabel(form.dueDate, today) : '',
      customDate: customDate,
      pickerValue: form.dueDate || today
    })
  },

  onTitleInput: function (event) {
    this.setData({ 'form.title': event.detail.value })
  },

  onNoteInput: function (event) {
    this.setData({ 'form.note': event.detail.value })
  },

  onColor: function (event) {
    this.setData({ 'form.color': event.currentTarget.dataset.value }, this.refreshPreview.bind(this))
  },

  onPriority: function (event) {
    const value = parseInt(event.currentTarget.dataset.value, 10)
    this.setData({ 'form.priority': value === 1 || value === 2 ? value : 0 })
  },

  onQuickDate: function (event) {
    const value = event.currentTarget.dataset.value
    this.setData({ 'form.dueDate': value }, this.refreshPreview.bind(this))
  },

  onDateChange: function (event) {
    this.setData({ 'form.dueDate': event.detail.value }, this.refreshPreview.bind(this))
  },

  onClearDate: function () {
    this.setData({ 'form.dueDate': '' }, this.refreshPreview.bind(this))
  },

  onSave: function () {
    const form = this.data.form
    const title = form.title.trim()
    if (!title) {
      wx.showToast({ title: '先写下要做什么吧', icon: 'none' })
      return
    }
    if (this.data.isEdit) {
      const updated = store.updateTask(this.data.taskId, {
        title: title,
        note: form.note,
        color: form.color,
        priority: form.priority,
        dueDate: form.dueDate
      })
      if (!updated) {
        wx.showToast({ title: '待办不存在', icon: 'none' })
        return
      }
      wx.showToast({ title: '已更新', icon: 'success' })
    } else {
      const created = store.addTask({
        title: title,
        note: form.note,
        color: form.color,
        priority: form.priority,
        dueDate: form.dueDate
      })
      if (!created) {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        return
      }
      wx.showToast({ title: '已加入彩虹清单', icon: 'success' })
    }
    setTimeout(function () {
      wx.navigateBack()
    }, 420)
  },

  onDelete: function () {
    const self = this
    wx.showModal({
      title: '删除这条待办？',
      content: '删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#ff6b6b',
      success: function (result) {
        if (!result.confirm) return
        store.removeTask(self.data.taskId)
        wx.showToast({ title: '已删除', icon: 'none' })
        setTimeout(function () {
          wx.navigateBack()
        }, 320)
      }
    })
  }
})
