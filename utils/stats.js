const dateUtil = require('./date')
const colors = require('./colors')

function computeWeekSeries(tasks, today) {
  const series = []
  for (let offset = -6; offset <= 0; offset++) {
    const date = dateUtil.addDays(today, offset)
    let count = 0
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      if (task.done && task.doneAt && dateUtil.dateOfTimestamp(task.doneAt) === date) count += 1
    }
    series.push({
      date: date,
      label: dateUtil.shortWeekday(date),
      count: count,
      percent: 0,
      isToday: offset === 0
    })
  }
  let max = 1
  for (let i = 0; i < series.length; i++) {
    if (series[i].count > max) max = series[i].count
  }
  for (let i = 0; i < series.length; i++) {
    series[i].percent = series[i].count > 0 ? Math.max(10, Math.round(series[i].count / max * 100)) : 4
  }
  return series
}

function computeStreak(tasks, today) {
  const doneDays = {}
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task.done && task.doneAt) doneDays[dateUtil.dateOfTimestamp(task.doneAt)] = true
  }
  let cursor = today
  if (!doneDays[cursor]) {
    cursor = dateUtil.addDays(today, -1)
    if (!doneDays[cursor]) return 0
  }
  let streak = 0
  while (doneDays[cursor] && streak < 3660) {
    streak += 1
    cursor = dateUtil.addDays(cursor, -1)
  }
  return streak
}

function computeColorStats(tasks) {
  const result = []
  for (let i = 0; i < colors.PALETTE.length; i++) {
    const entry = colors.PALETTE[i]
    let count = 0
    for (let j = 0; j < tasks.length; j++) {
      if (String(tasks[j].color).toUpperCase() === entry.value.toUpperCase()) count += 1
    }
    result.push({
      name: entry.name,
      color: entry.value,
      count: count,
      percent: 0
    })
  }
  let max = 0
  for (let i = 0; i < result.length; i++) {
    if (result[i].count > max) max = result[i].count
  }
  for (let i = 0; i < result.length; i++) {
    result[i].percent = max > 0 ? Math.round(result[i].count / max * 100) : 0
  }
  return result
}

function computeStats(tasks, today, dailyGoal) {
  const goal = dailyGoal >= 1 ? dailyGoal : 3
  let total = tasks.length
  let done = 0
  let doneToday = 0
  let dueToday = 0
  let overdue = 0
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    if (task.done) done += 1
    if (task.dueDate === today) dueToday += 1
    if (task.done && task.doneAt && dateUtil.dateOfTimestamp(task.doneAt) === today) doneToday += 1
    if (!task.done && task.dueDate && dateUtil.isPastDate(task.dueDate, today)) overdue += 1
  }
  const pending = total - done
  const weekSeries = computeWeekSeries(tasks, today)
  let weekDone = 0
  for (let i = 0; i < weekSeries.length; i++) weekDone += weekSeries[i].count
  return {
    total: total,
    done: done,
    pending: pending,
    dueToday: dueToday,
    doneToday: doneToday,
    overdue: overdue,
    goal: goal,
    weekDone: weekDone,
    percent: total > 0 ? Math.round(done / total * 100) : 0,
    todayPercent: Math.min(100, Math.round(doneToday / goal * 100)),
    streak: computeStreak(tasks, today),
    weekSeries: weekSeries,
    colorStats: computeColorStats(tasks)
  }
}

module.exports = {
  computeStats: computeStats,
  computeWeekSeries: computeWeekSeries,
  computeStreak: computeStreak,
  computeColorStats: computeColorStats
}
