from PIL import Image
import os
base = os.path.join(os.getcwd(), 'images')
names = ['tab-home', 'tab-stats', 'tab-mine']
cell = 150
pad = 24
sheet = Image.new('RGB', (cell*3 + pad*4, cell*2 + pad*3), (255, 255, 255))
for row, suffix in enumerate(['', '-on']):
    for col, name in enumerate(names):
        icon = Image.open(os.path.join(base, name + suffix + '.png')).convert('RGBA')
        icon = icon.resize((cell, cell), Image.LANCZOS)
        x = pad + col*(cell+pad)
        y = pad + row*(cell+pad)
        sheet.paste(icon, (x, y), icon)
sheet.save(os.path.join(os.getcwd(), 'preview', 'icons-sheet.png'))
print('ok')
