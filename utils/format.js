const dateUtil = require('./date')
const colors = require('./colors')

const PRIORITY_LABELS = ['普通', '重要', '紧急']
const PRIORITY_CLASSES = ['p0', 'p1', 'p2']

function buildTaskView(task, today) {
  const isDone = task.done === true
  let dueLabel = ''
  let overdue = false
  if (task.dueDate) {
    if (isDone) {
      dueLabel = '已完成'
    } else {
      dueLabel = dateUtil.relativeDueLabel(task.dueDate, today)
      overdue = dateUtil.isPastDate(task.dueDate, today)
    }
  }
  return {
    id: task.id,
    title: task.title,
    note: task.note,
    color: task.color,
    softColor: colors.withAlpha(task.color, 0.14),
    colorName: colors.colorName(task.color),
    priority: task.priority,
    priorityLabel: PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[0],
    priorityClass: PRIORITY_CLASSES[task.priority] || PRIORITY_CLASSES[0],
    dueDate: task.dueDate,
    dueLabel: dueLabel,
    overdue: overdue,
    done: isDone,
    doneAt: task.doneAt
  }
}

function buildTaskViews(tasks, today) {
  const result = []
  for (let i = 0; i < tasks.length; i++) {
    result.push(buildTaskView(tasks[i], today))
  }
  return result
}

module.exports = {
  PRIORITY_LABELS: PRIORITY_LABELS,
  buildTaskView: buildTaskView,
  buildTaskViews: buildTaskViews
}
