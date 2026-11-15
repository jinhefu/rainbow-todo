function sortTasks(tasks) {
  const list = tasks.slice()
  list.sort(function (a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (!a.done) {
      if (a.dueDate !== b.dueDate) {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate < b.dueDate ? -1 : 1
      }
      if (a.priority !== b.priority) return b.priority - a.priority
      return b.createdAt - a.createdAt
    }
    return (b.doneAt || b.updatedAt || 0) - (a.doneAt || a.updatedAt || 0)
  })
  return list
}

function filterTasks(tasks, filter) {
  if (filter === 'pending') {
    return tasks.filter(function (task) { return !task.done })
  }
  if (filter === 'done') {
    return tasks.filter(function (task) { return task.done })
  }
  return tasks.slice()
}

function countTasks(tasks) {
  let done = 0
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].done) done += 1
  }
  return {
    all: tasks.length,
    done: done,
    pending: tasks.length - done
  }
}

module.exports = {
  sortTasks: sortTasks,
  filterTasks: filterTasks,
  countTasks: countTasks
}
