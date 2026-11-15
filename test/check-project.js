const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const problems = []
let checked = 0

function fail(message) {
  problems.push(message)
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel))
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function walk(dir, out) {
  const entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true })
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const rel = dir ? dir + '/' + entry.name : entry.name
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.cc-safety-net' || entry.name === 'preview') continue
      walk(rel, out)
    } else {
      out.push(rel)
    }
  }
  return out
}

const allFiles = walk('', [])
const codeFiles = allFiles.filter(function (file) { return file.endsWith('.js') })
const jsonFiles = allFiles.filter(function (file) { return file.endsWith('.json') })
const wxmlFiles = allFiles.filter(function (file) { return file.endsWith('.wxml') })
const wxssFiles = allFiles.filter(function (file) { return file.endsWith('.wxss') })

console.log('')
console.log('彩虹待办 · 工程静态检查')
console.log('========================')

// 1. JSON 合法性
for (let i = 0; i < jsonFiles.length; i++) {
  checked += 1
  try {
    JSON.parse(read(jsonFiles[i]))
  } catch (error) {
    fail('JSON 解析失败 ' + jsonFiles[i] + ': ' + error.message)
  }
}
console.log('JSON 文件: ' + jsonFiles.length + ' 个解析通过')

// 2. app.json 与页面文件完整性
let appConfig = null
try {
  appConfig = JSON.parse(read('app.json'))
} catch (error) {
  fail('app.json 无法解析')
}

if (appConfig) {
  const pages = appConfig.pages || []
  if (pages.length < 4) fail('app.json 页面数量不足：' + pages.length)
  if (pages[0] !== 'pages/index/index') fail('首页必须是 pages/index/index')
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const required = ['.js', '.json', '.wxml', '.wxss']
    for (let j = 0; j < required.length; j++) {
      checked += 1
      if (!exists(page + required[j])) fail('缺少页面文件: ' + page + required[j])
    }
  }
  const tabBar = appConfig.tabBar || {}
  const tabs = tabBar.list || []
  if (tabs.length !== 3) fail('tabBar 应有 3 个标签，实际 ' + tabs.length)
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]
    if (pages.indexOf(tab.pagePath) < 0) fail('tabBar 页面未注册: ' + tab.pagePath)
    if (!exists(tab.iconPath)) fail('缺少图标: ' + tab.iconPath)
    if (!exists(tab.selectedIconPath)) fail('缺少选中图标: ' + tab.selectedIconPath)
  }
  console.log('页面与 tabBar: ' + pages.length + ' 个页面，' + tabs.length + ' 个标签检查通过')
}

// 3. JS 语法
for (let i = 0; i < codeFiles.length; i++) {
  checked += 1
  const source = read(codeFiles[i])
  try {
    new Function(source)
  } catch (error) {
    fail('JS 语法错误 ' + codeFiles[i] + ': ' + error.message)
  }
}
console.log('JS 语法: ' + codeFiles.length + ' 个文件解析通过')

// 4. WXSS 花括号配平
for (let i = 0; i < wxssFiles.length; i++) {
  checked += 1
  const source = read(wxssFiles[i])
  const open = (source.match(/\{/g) || []).length
  const close = (source.match(/\}/g) || []).length
  if (open !== close) fail('WXSS 花括号不配平 ' + wxssFiles[i] + ' (' + open + ' vs ' + close + ')')
}
console.log('WXSS 花括号: ' + wxssFiles.length + ' 个文件通过')

// 5. WXML 标签配平 + 事件绑定存在性
const TAG_PATTERN = /<(\/?)([A-Za-z][A-Za-z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g
const BIND_PATTERN = /(?:bind|catch)[A-Za-z:]*="([A-Za-z_$][A-Za-z0-9_$]*)"/g

for (let i = 0; i < wxmlFiles.length; i++) {
  checked += 1
  const rel = wxmlFiles[i]
  let source = read(rel)
  source = source.replace(/<!--[\s\S]*?-->/g, '')
  const stack = []
  TAG_PATTERN.lastIndex = 0
  let match = TAG_PATTERN.exec(source)
  while (match) {
    const closing = match[1] === '/'
    const name = match[2]
    const selfClosing = match[4] === '/'
    if (closing) {
      const last = stack.pop()
      if (last !== name) fail('WXML 标签不匹配 ' + rel + ': 期望 </' + last + '> 实际 </' + name + '>')
    } else if (!selfClosing) {
      stack.push(name)
    }
    match = TAG_PATTERN.exec(source)
  }
  if (stack.length > 0) fail('WXML 存在未闭合标签 ' + rel + ': ' + stack.join(', '))
  const openMoustache = (source.match(/\{\{/g) || []).length
  const closeMoustache = (source.match(/\}\}/g) || []).length
  if (openMoustache !== closeMoustache) fail('WXML 插值括号不匹配 ' + rel)
}

for (let i = 0; i < wxmlFiles.length; i++) {
  const rel = wxmlFiles[i]
  const jsRel = rel.replace(/\.wxml$/, '.js')
  if (!exists(jsRel)) continue
  const source = read(rel)
  const js = read(jsRel)
  BIND_PATTERN.lastIndex = 0
  let match = BIND_PATTERN.exec(source)
  while (match) {
    checked += 1
    const handler = match[1]
    const present = new RegExp('(^|[^A-Za-z0-9_$])' + handler + '\\s*[:(]').test(js)
    if (!present) fail('事件处理函数缺失 ' + jsRel + ' -> ' + handler)
    match = BIND_PATTERN.exec(source)
  }
}
console.log('WXML 标签与事件: ' + wxmlFiles.length + ' 个页面通过')

// 6. 模板泄漏检查
for (let i = 0; i < codeFiles.length; i++) {
  if (codeFiles[i].indexOf('test/') === 0) continue
  const source = read(codeFiles[i])
  checked += 1
  if (source.indexOf(String.fromCharCode(36) + '{') >= 0) {
    fail('发现疑似模板插值泄漏 ' + codeFiles[i])
  }
}
console.log('模板泄漏检查通过')

// 7. 图标尺寸
for (let i = 0; i < 6; i++) {
  const name = ['tab-home', 'tab-home-on', 'tab-stats', 'tab-stats-on', 'tab-mine', 'tab-mine-on'][i]
  const file = path.join(root, 'images', name + '.png')
  checked += 1
  if (!fs.existsSync(file)) {
    fail('缺少图标文件 images/' + name + '.png')
    continue
  }
  const bytes = fs.readFileSync(file)
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (width !== 81 || height !== 81) fail('图标尺寸应为 81x81: images/' + name + '.png (' + width + 'x' + height + ')')
  if (bytes.length > 40 * 1024) fail('图标超过 40KB: images/' + name + '.png')
}
console.log('图标: 6 个文件尺寸与体积通过')

console.log('')
console.log('========================')
console.log('共检查 ' + checked + ' 项，发现问题 ' + problems.length + ' 个')
if (problems.length > 0) {
  for (let i = 0; i < problems.length; i++) console.log('  - ' + problems[i])
  process.exit(1)
}
console.log('全部检查通过')
