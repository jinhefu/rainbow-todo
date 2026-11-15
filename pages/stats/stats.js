const store = require('../../utils/store')
const statsUtil = require('../../utils/stats')
const dateUtil = require('../../utils/date')

const QUOTES = [
  '每一件小事，都是彩虹的一道颜色。',
  '完成比完美更重要，先做一点点。',
  '把大目标拆成小步，走起来就轻了。',
  '今天的一小步，是明天的一大步。',
  '允许自己慢一点，但别停下来。',
  '记录本身，就是一种进步。',
  '给已完成的事一点掌声。',
  '彩虹总在雨后，你也可以现在就出发。'
]

Page({
  data: {
    todayLabel: '',
    stats: {},
    quote: ''
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
    const quote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]
    this.setData({
      todayLabel: dateUtil.friendlyDateLabel(today),
      stats: summary,
      quote: quote
    })
  }
})
