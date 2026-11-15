const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六']

function pad2(value) {
  return value < 10 ? '0' + value : '' + value
}

function toDateString(input) {
  const date = input instanceof Date ? input : new Date(input)
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

function todayString() {
  return toDateString(new Date())
}

function parseDateString(value) {
  if (!value || typeof value !== 'string') return null
  const parts = value.split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(value, offset) {
  const date = parseDateString(value) || new Date()
  date.setDate(date.getDate() + offset)
  return toDateString(date)
}

function dayDiff(from, to) {
  const start = parseDateString(from)
  const end = parseDateString(to)
  if (!start || !end) return 0
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.round((endUTC - startUTC) / 86400000)
}

function weekdayLabel(value) {
  const date = parseDateString(value)
  return date ? WEEKDAYS[date.getDay()] : ''
}

function shortWeekday(value) {
  const date = parseDateString(value)
  return date ? WEEKDAYS_SHORT[date.getDay()] : ''
}

function monthDayLabel(value) {
  const date = parseDateString(value)
  if (!date) return ''
  return (date.getMonth() + 1) + '月' + date.getDate() + '日'
}

function friendlyDateLabel(value) {
  const date = parseDateString(value)
  if (!date) return ''
  return monthDayLabel(value) + ' ' + weekdayLabel(value)
}

function relativeDueLabel(dueDate, today) {
  if (!dueDate || !today) return ''
  const diff = dayDiff(today, dueDate)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === 2) return '后天'
  if (diff === -1) return '昨天'
  if (diff < 0) return '逾期 ' + (-diff) + ' 天'
  if (diff <= 7) return diff + ' 天后'
  return monthDayLabel(dueDate)
}

function greeting(now) {
  const date = now instanceof Date ? now : new Date()
  const hour = date.getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 23) return '晚上好'
  return '夜深了'
}

function isPastDate(value, today) {
  if (!value || !today) return false
  return dayDiff(today, value) < 0
}

function dateOfTimestamp(timestamp) {
  if (!timestamp) return ''
  return toDateString(new Date(timestamp))
}

module.exports = {
  WEEKDAYS: WEEKDAYS,
  WEEKDAYS_SHORT: WEEKDAYS_SHORT,
  pad2: pad2,
  toDateString: toDateString,
  todayString: todayString,
  parseDateString: parseDateString,
  addDays: addDays,
  dayDiff: dayDiff,
  weekdayLabel: weekdayLabel,
  shortWeekday: shortWeekday,
  monthDayLabel: monthDayLabel,
  friendlyDateLabel: friendlyDateLabel,
  relativeDueLabel: relativeDueLabel,
  greeting: greeting,
  isPastDate: isPastDate,
  dateOfTimestamp: dateOfTimestamp
}
