const store = require('./utils/store')

App({
  globalData: {
    appName: '彩虹待办',
    version: '1.0.0'
  },

  onLaunch: function () {
    // 预热本地存储，保证首次启动时数据结构完整
    store.getTasks()
    store.getSettings()
  }
})
