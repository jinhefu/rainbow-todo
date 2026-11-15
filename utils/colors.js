const PALETTE = [
  { name: '草莓红', value: '#FF6B6B' },
  { name: '蜜橘橙', value: '#FFA94D' },
  { name: '柠檬黄', value: '#FFD43B' },
  { name: '青草绿', value: '#51CF66' },
  { name: '薄荷青', value: '#20C997' },
  { name: '晴空蓝', value: '#4DABF7' },
  { name: '葡萄紫', value: '#9775FA' },
  { name: '樱花粉', value: '#F783AC' }
]

const DEFAULT_COLOR = PALETTE[0].value

function colorName(value) {
  const target = String(value || '').toUpperCase()
  for (let i = 0; i < PALETTE.length; i++) {
    if (PALETTE[i].value.toUpperCase() === target) return PALETTE[i].name
  }
  return '彩虹色'
}

function isPaletteColor(value) {
  return colorName(value) !== '彩虹色'
}

function withAlpha(hex, alpha) {
  const value = String(hex || '').replace('#', '')
  if (value.length !== 6) return 'rgba(255, 107, 107, ' + alpha + ')'
  const red = parseInt(value.slice(0, 2), 16)
  const green = parseInt(value.slice(2, 4), 16)
  const blue = parseInt(value.slice(4, 6), 16)
  return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')'
}

module.exports = {
  PALETTE: PALETTE,
  DEFAULT_COLOR: DEFAULT_COLOR,
  colorName: colorName,
  isPaletteColor: isPaletteColor,
  withAlpha: withAlpha
}
