from PIL import Image, ImageDraw
import os

SIZE = 81
SCALE = 4
BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'images')
os.makedirs(BASE, exist_ok=True)

NORMAL = (154, 160, 180, 255)


def s(value):
    return int(round(value * SCALE))


def stroke():
    return max(2, int(round(5 * SCALE)))


def canvas():
    image = Image.new('RGBA', (SIZE * SCALE, SIZE * SCALE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def save(image, name):
    image = image.resize((SIZE, SIZE), Image.LANCZOS)
    image.save(os.path.join(BASE, name))


def home_icon(color):
    image, draw = canvas()
    draw.line([(s(14), s(40)), (s(40.5), s(16)), (s(67), s(40))], fill=color, width=stroke(), joint='curve')
    draw.line([(s(21.5), s(34)), (s(21.5), s(66)), (s(59.5), s(66)), (s(59.5), s(34))], fill=color, width=stroke(), joint='curve')
    draw.line([(s(34), s(66)), (s(34), s(47)), (s(47), s(47)), (s(47), s(66))], fill=color, width=stroke(), joint='curve')
    return image


def stats_icon(color):
    image, draw = canvas()
    draw.rounded_rectangle([s(17), s(44), s(30), s(67)], radius=s(6), fill=color)
    draw.rounded_rectangle([s(34), s(28), s(47), s(67)], radius=s(6), fill=color)
    draw.rounded_rectangle([s(51), s(36), s(64), s(67)], radius=s(6), fill=color)
    return image


def mine_icon(color):
    image, draw = canvas()
    draw.ellipse([s(30), s(17), s(51), s(38)], outline=color, width=stroke())
    draw.arc([s(19), s(42), s(62), s(82)], start=185, end=355, fill=color, width=stroke())
    return image


ICONS = {
    'tab-home': (home_icon, NORMAL, (255, 107, 157, 255)),
    'tab-stats': (stats_icon, NORMAL, (77, 171, 247, 255)),
    'tab-mine': (mine_icon, NORMAL, (151, 117, 250, 255)),
}

for name, (builder, normal, active) in ICONS.items():
    save(builder(normal), name + '.png')
    save(builder(active), name + '-on.png')

print('icons written:', sorted(os.listdir(BASE)))
