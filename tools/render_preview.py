import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 2
PHONE_W, PHONE_H = 375, 812
GAP, PAD = 34, 44
HEADER_H, CAPTION_H = 80, 36
BOARD_W = PAD * 2 + PHONE_W * 3 + GAP * 2
BOARD_H = PAD + HEADER_H + PHONE_H + CAPTION_H + PAD

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(BASE, 'images')
FONT_REG = 'C:/Windows/Fonts/msyh.ttc'
FONT_BOLD = 'C:/Windows/Fonts/msyhbd.ttc'

FONT_CACHE = {}


def font(size, bold=False):
    key = (round(size, 1), bold)
    if key not in FONT_CACHE:
        path = FONT_BOLD if bold else FONT_REG
        FONT_CACHE[key] = ImageFont.truetype(path, int(round(size * S)))
    return FONT_CACHE[key]


def u(value):
    return int(round(value * S))


def rgb(value):
    value = value.lstrip('#')
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


def hexa(value, alpha=255):
    return rgb(value) + (alpha,)


def tint(value, alpha):
    c = rgb(value)
    return (int(255 - (255 - c[0]) * alpha), int(255 - (255 - c[1]) * alpha), int(255 - (255 - c[2]) * alpha), 255)


INK = hexa('#24293a')
INK_SOFT = hexa('#6b7288')
INK_FAINT = hexa('#9aa0b4')
LINE = hexa('#eef0f7')
WHITE = hexa('#ffffff')
BG = hexa('#f6f7fb')
TRACK = hexa('#f0f2f8')
RAINBOW = [rgb('#ff6b6b'), rgb('#ffa94d'), rgb('#ffd43b'), rgb('#51cf66'), rgb('#4dabf7'), rgb('#9775fa')]
RAINBOW_SOFT = [rgb('#ff6b6b'), rgb('#ffa94d'), rgb('#9775fa')]


def ramp_color(i, n, stops):
    if len(stops) == 1:
        return stops[0]
    t = i / float(n - 1)
    pos = t * (len(stops) - 1)
    idx = int(pos)
    if idx >= len(stops) - 1:
        return tuple(stops[-1])
    frac = pos - idx
    c1 = stops[idx]
    c2 = stops[idx + 1]
    return (int(c1[0] + (c2[0] - c1[0]) * frac), int(c1[1] + (c2[1] - c1[1]) * frac), int(c1[2] + (c2[2] - c1[2]) * frac))


def gradient(size, stops, horizontal=True):
    w, h = size
    n = 256
    if horizontal:
        ramp = Image.new('RGB', (n, 1))
        for i in range(n):
            ramp.putpixel((i, 0), ramp_color(i, n, stops))
        return ramp.resize((w, h), Image.BILINEAR)
    ramp = Image.new('RGB', (1, n))
    for i in range(n):
        ramp.putpixel((0, i), ramp_color(i, n, stops))
    return ramp.resize((w, h), Image.BILINEAR)


def paste_gradient(base, box, radius, stops, horizontal=True):
    x0, y0, x1, y1 = box
    w, h = u(x1 - x0), u(y1 - y0)
    if w <= 0 or h <= 0:
        return
    g = gradient((w, h), stops, horizontal)
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], radius=u(radius), fill=255)
    base.paste(g, (u(x0), u(y0)), mask)


def rect(d, box, radius, fill):
    d.rounded_rectangle([u(box[0]), u(box[1]), u(box[2]), u(box[3])], radius=u(radius), fill=fill)


def circle(d, cx, cy, r, fill=None, outline_color=None, width=1):
    d.ellipse([u(cx - r), u(cy - r), u(cx + r), u(cy + r)], fill=fill, outline=outline_color, width=u(width))


def soft_shadow(img, box, radius, blur=10, alpha=26, dy=5):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    pad = blur * 2
    mask = Image.new('L', (u(w + pad * 2), u(h + pad * 2)), 0)
    ImageDraw.Draw(mask).rounded_rectangle([u(pad), u(pad), u(pad + w), u(pad + h)], radius=u(radius), fill=alpha)
    mask = mask.filter(ImageFilter.GaussianBlur(u(blur)))
    shadow = Image.new('RGBA', mask.size, (38, 45, 82, 255))
    img.paste(shadow, (u(x0 - pad), u(y0 - pad + dy)), mask)


def txt(d, xy, text, size, color, bold=False, anchor='la'):
    d.text((u(xy[0]), u(xy[1])), text, font=font(size, bold), fill=color, anchor=anchor)


def tw(d, text, size, bold=False):
    return d.textlength(text, font=font(size, bold)) / S


def grad_text(base, xy, text, size, stops, bold=False):
    f = font(size, bold)
    tmp = Image.new('L', (2, 2))
    bbox = ImageDraw.Draw(tmp).textbbox((0, 0), text, font=f)
    w = max(2, int(bbox[2]) + 4)
    h = max(2, int(bbox[3]) + 4)
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).text((0, 0), text, font=f, fill=255)
    g = gradient((w, h), stops, horizontal=True)
    base.paste(g, (u(xy[0]), u(xy[1])), mask)
    return w / S


def check_mark(d, cx, cy, size, color):
    w = max(2, u(2))
    d.line([u(cx - size * 0.52), u(cy), u(cx - size * 0.08), u(cy + size * 0.42)], fill=color, width=w)
    d.line([u(cx - size * 0.08), u(cy + size * 0.42), u(cx + size * 0.58), u(cy - size * 0.46)], fill=color, width=w)


def status_bar(d, w):
    txt(d, (24, 22), '9:41', 12, INK, bold=True, anchor='lm')
    txt(d, (w - 24, 22), '●●●  ▮', 11, INK, anchor='rm')


def nav_bar(d, w, title, back=False):
    if back:
        txt(d, (18, 66), '‹', 26, INK, anchor='lm')
    txt(d, (w / 2.0, 66), title, 16, INK, bold=True, anchor='mm')


def tab_bar(img, d, w, active):
    top = PHONE_H - 56
    rect(d, (0, top, w, PHONE_H), 0, WHITE)
    d.line([(0, u(top)), (u(w), u(top))], fill=LINE, width=max(1, u(1)))
    names = ['待办', '统计', '我的']
    bases = ['tab-home', 'tab-stats', 'tab-mine']
    for i in range(3):
        cx = w * (i + 0.5) / 3.0
        name = bases[i] + ('-on' if i == active else '')
        icon = Image.open(os.path.join(IMAGES, name + '.png')).convert('RGBA')
        icon = icon.resize((u(24), u(24)), Image.LANCZOS)
        img.paste(icon, (u(cx) - u(12), u(top + 8)), icon)
        color = INK if i == active else INK_FAINT
        txt(d, (cx, PHONE_H - 12), names[i], 10, color, bold=(i == active), anchor='mm')


def rainbow_arc(d, cx, cy, radius, band=2.4):
    for i in range(6):
        r = radius - i * band
        d.arc([u(cx - r), u(cy - r), u(cx + r), u(cy + r)], start=180, end=360, fill=RAINBOW[i] + (255,), width=max(1, u(band)))
    circle(d, cx - radius - 1, cy + 2, 4, fill=WHITE)
    circle(d, cx + radius + 1, cy + 2, 4, fill=WHITE)


def quick_chip(d, x, y, text, on, size=13, height=30, padx=14):
    width = tw(d, text, size, on) + padx * 2
    if on:
        rect(d, (x, y, x + width, y + height), height / 2.0, INK)
        txt(d, (x + padx, y + height / 2.0), text, size, WHITE, bold=True, anchor='lm')
    else:
        rect(d, (x, y, x + width, y + height), height / 2.0, WHITE)
        txt(d, (x + padx, y + height / 2.0), text, size, INK_SOFT, anchor='lm')
    return width


def task_card(img, d, y, data):
    note = data.get('note')
    height = 92 if note else 76
    box = (16, y, 359, y + height)
    soft_shadow(img, box, 14, blur=8, alpha=18, dy=4)
    rect(d, box, 14, WHITE)
    accent = hexa(data['color'])
    rect(d, (16, y + 6, 20, y + height - 6), 2, accent)
    cy = y + 26
    if data.get('done'):
        circle(d, 32, cy, 11, fill=accent)
        check_mark(d, 32, cy, 9, WHITE)
    else:
        circle(d, 32, cy, 11, outline_color=accent, width=2)
    tx = 54
    txt(d, (tx, y + 14), data['title'], 15, INK_FAINT if data.get('done') else INK, bold=True)
    if data.get('done'):
        title_w = tw(d, data['title'], 15, True)
        d.line([(u(tx), u(y + 24)), (u(tx + title_w), u(y + 24))], fill=INK_FAINT, width=max(1, u(1)))
    meta_y = y + 38
    mx = tx
    tag_text = data['tag']
    tag_w = tw(d, tag_text, 10) + 12
    rect(d, (mx, meta_y - 1, mx + tag_w, meta_y + 15), 4, tint(data['color'], 0.14))
    txt(d, (mx + 6, meta_y + 7), tag_text, 10, accent, anchor='lm')
    mx += tag_w + 6
    if data.get('due'):
        due_color = hexa('#ff6b6b') if data.get('warn') else INK_FAINT
        txt(d, (mx, meta_y + 7), data['due'], 11, due_color, anchor='lm')
        mx += tw(d, data['due'], 11) + 6
    if data.get('prio'):
        pw = tw(d, data['prio'], 10) + 12
        bg = hexa('#ffe8e8') if data['prio'] == '紧急' else hexa('#fff3e0')
        fg = hexa('#e03131') if data['prio'] == '紧急' else hexa('#f08c00')
        rect(d, (mx, meta_y - 1, mx + pw, meta_y + 15), 4, bg)
        txt(d, (mx + 6, meta_y + 7), data['prio'], 10, fg, anchor='lm')
    if note:
        txt(d, (tx, y + 60), note, 12, INK_SOFT)
    return height


def draw_home(img, d, w):
    status_bar(d, w)
    nav_bar(d, w, '彩虹待办')

    txt(d, (16, 96), '11月15日 周六', 12, INK_FAINT)
    grad_text(img, (16, 110), '彩虹待办', 34, RAINBOW, bold=True)
    txt(d, (16, 158), '晚上好，彩虹追梦人', 13, INK_SOFT)
    rainbow_arc(d, 331, 130, 19, 2.4)

    soft_shadow(img, (16, 182, 359, 306), 16, blur=12, alpha=30, dy=6)
    rect(d, (16, 182, 359, 306), 16, WHITE)
    txt(d, (32, 197), '今日进度', 12, INK_FAINT)
    txt(d, (32, 212), '1', 26, INK, bold=True)
    txt(d, (32 + tw(d, '1', 26, True) + 4, 224), '/ 3 件', 12, INK_FAINT)
    paste_gradient(img, (283, 199, 343, 227), 14, RAINBOW_SOFT, horizontal=True)
    txt(d, (313, 213), '33%', 13, WHITE, bold=True, anchor='mm')
    rect(d, (32, 258, 343, 266), 4, TRACK)
    paste_gradient(img, (32, 258, 134, 266), 4, RAINBOW, horizontal=True)
    txt(d, (32, 275), '3 件待办', 11, INK_FAINT)
    txt(d, (343, 275), '本周完成 4 件', 11, INK_FAINT, anchor='ra')

    x = 16
    for text, on in [('全部 4', True), ('待办 3', False), ('已完成 1', False)]:
        width = tw(d, text, 13, on) + 26
        if on:
            rect(d, (x, 320, x + width, 349), 14.5, INK)
            txt(d, (x + 13, 334.5), text, 13, WHITE, bold=True, anchor='lm')
        else:
            rect(d, (x, 320, x + width, 349), 14.5, WHITE)
            txt(d, (x + 13, 334.5), text, 13, INK_SOFT, anchor='lm')
        x += width + 8

    tasks = [
        {'title': '完成产品原型评审', 'color': '#FF6B6B', 'tag': '草莓红', 'due': '今天', 'prio': '紧急', 'note': '对齐交互细节与验收标准'},
        {'title': '给妈妈打个电话', 'color': '#4DABF7', 'tag': '晴空蓝', 'due': '明天'},
        {'title': '晨跑 3 公里', 'color': '#51CF66', 'tag': '青草绿', 'due': '已完成', 'done': True},
        {'title': '提交季度报销单', 'color': '#9775FA', 'tag': '葡萄紫', 'due': '逾期 2 天', 'warn': True, 'prio': '重要'},
    ]
    y = 358
    for task in tasks:
        y += task_card(img, d, y, task) + 10

    cx, cy = w - 22 - 28, 706
    soft_shadow(img, (cx - 28, cy - 28, cx + 28, cy + 28), 28, blur=12, alpha=55, dy=6)
    d.ellipse([u(cx - 28), u(cy - 28), u(cx + 28), u(cy + 28)], fill=hexa('#9775fa'))
    gmask = Image.new('L', (u(56), u(56)), 0)
    ImageDraw.Draw(gmask).ellipse([0, 0, u(56) - 1, u(56) - 1], fill=255)
    circle_grad = gradient((u(56), u(56)), [rgb('#ff6b6b'), rgb('#ffa94d'), rgb('#9775fa')], horizontal=False)
    img.paste(circle_grad, (u(cx - 28), u(cy - 28)), gmask)
    d.line([(u(cx - 9), u(cy)), (u(cx + 9), u(cy))], fill=WHITE, width=max(2, u(3)))
    d.line([(u(cx), u(cy - 9)), (u(cx), u(cy + 9))], fill=WHITE, width=max(2, u(3)))

    tab_bar(img, d, w, 0)


def draw_editor(img, d, w):
    status_bar(d, w)
    nav_bar(d, w, '编辑待办', back=True)

    rect(d, (0, 88, w, PHONE_H), 0, BG)
    paste_gradient(img, (0, 88, w, 300), 0, [rgb('#fdf7fb'), rgb('#f6f7fb')], horizontal=False)

    txt(d, (20, 106), '编辑待办', 12, INK_FAINT)
    grad_text(img, (20, 122), '让细节更清晰', 22, RAINBOW, bold=True)

    soft_shadow(img, (16, 157, 359, 247), 16, blur=10, alpha=22, dy=4)
    rect(d, (16, 157, 359, 247), 16, WHITE)
    txt(d, (32, 172), '完成产品原型评审', 18, INK, bold=True)
    d.line([(u(32), u(197)), (u(343), u(197))], fill=LINE, width=max(1, u(1)))
    txt(d, (32, 205), '对齐交互细节与验收标准', 14, INK_SOFT)

    txt(d, (20, 267), '选一个彩虹色', 12, INK_FAINT)
    palette = ['#FF6B6B', '#FFA94D', '#FFD43B', '#51CF66', '#20C997', '#4DABF7', '#9775FA', '#F783AC']
    sx = 20
    for i, color in enumerate(palette):
        cx = sx + 18
        if i == 0:
            circle(d, cx, 306, 19, fill=WHITE)
            circle(d, cx, 306, 18, fill=hexa(color))
            check_mark(d, cx, 306, 9, WHITE)
        else:
            circle(d, cx, 306, 18, fill=hexa(color))
        sx += 36 + 6
    txt(d, (20, 330), '草莓红', 12, INK_FAINT)

    txt(d, (20, 360), '优先级', 12, INK_FAINT)
    rect(d, (16, 380, 359, 414), 11, hexa('#eef0f7'))
    seg_w = (343 - 8) / 3.0
    for i, label in enumerate(['普通', '重要', '紧急']):
        x0 = 20 + i * seg_w
        if i == 2:
            rect(d, (x0 + 2, 384, x0 + seg_w - 2, 410), 8, WHITE)
            txt(d, (x0 + seg_w / 2.0, 397), label, 13, INK, bold=True, anchor='mm')
        else:
            txt(d, (x0 + seg_w / 2.0, 397), label, 13, INK_SOFT, anchor='mm')

    txt(d, (20, 436), '截止日期', 12, INK_FAINT)
    x = 20
    for label, on in [('今天', True), ('明天', False), ('后天', False), ('选择日期', False)]:
        width = quick_chip(d, x, 456, label, on, 13, 30, 14)
        x += width + 8
    txt(d, (20, 494), '已设为 2026-11-15（今天）', 12, INK_FAINT)
    txt(d, (355, 494), '清除日期', 12, hexa('#ff6b6b'), anchor='ra')

    soft_shadow(img, (16, 540, 359, 590), 25, blur=12, alpha=45, dy=6)
    paste_gradient(img, (16, 540, 359, 590), 25, RAINBOW_SOFT, horizontal=True)
    txt(d, (w / 2.0, 565), '保存修改', 16, WHITE, bold=True, anchor='mm')
    txt(d, (w / 2.0, 612), '删除这条待办', 13, hexa('#ff6b6b'), anchor='mm')


def draw_stats(img, d, w):
    status_bar(d, w)
    nav_bar(d, w, '彩虹统计')

    grad_text(img, (20, 100), '彩虹统计', 28, RAINBOW, bold=True)
    txt(d, (20, 138), '11月15日 周六 · 看见自己的每一点进步', 12, INK_FAINT)

    metrics = [('12', ''), ('8', ''), ('5', ''), ('4', '天')]
    labels = ['全部待办', '已完成', '本周完成', '连续打卡']
    for i in range(4):
        col = i % 2
        row = i // 2
        x = 16 + col * 177
        y = 158 + row * 97
        box = (x, y, x + 166, y + 87)
        soft_shadow(img, box, 16, blur=8, alpha=18, dy=4)
        rect(d, box, 16, WHITE)
        txt(d, (x + 14, y + 14), metrics[i][0], 26, INK, bold=True)
        if metrics[i][1]:
            txt(d, (x + 14 + tw(d, metrics[i][0], 26, True) + 3, y + 28), metrics[i][1], 12, INK_FAINT)
        txt(d, (x + 14, y + 50), labels[i], 12, INK_FAINT)

    soft_shadow(img, (16, 346, 359, 536), 16, blur=10, alpha=20, dy=4)
    rect(d, (16, 346, 359, 536), 16, WHITE)
    txt(d, (32, 361), '近 7 天完成情况', 15, INK, bold=True)
    txt(d, (343, 363), '今天已完成 1 件', 11, INK_FAINT, anchor='ra')

    counts = [0, 1, 0, 2, 1, 2, 1]
    percents = [22, 40, 4, 80, 40, 80, 40]
    labels7 = ['一', '二', '三', '四', '五', '六', '日']
    left, right = 48.0, 327.0
    for i in range(7):
        cx = left + (right - left) * i / 6.0
        if counts[i] > 0:
            txt(d, (cx, 400), str(counts[i]), 10, INK_FAINT, anchor='mm')
        rect(d, (cx - 7, 409, cx + 7, 499), 7, TRACK)
        hgt = 90 * percents[i] / 100.0
        if hgt >= 7:
            if i == 6:
                paste_gradient(img, (cx - 7, 499 - hgt, cx + 7, 499), 7, [rgb('#9775fa'), rgb('#4dabf7')], horizontal=False)
            else:
                paste_gradient(img, (cx - 7, 499 - hgt, cx + 7, 499), 7, [rgb('#ffd43b'), rgb('#ff6b6b')], horizontal=False)
        color = hexa('#9775fa') if i == 6 else INK_FAINT
        txt(d, (cx, 515), labels7[i], 11, color, bold=(i == 6), anchor='mm')

    soft_shadow(img, (16, 548, 359, 749), 16, blur=10, alpha=20, dy=4)
    rect(d, (16, 548, 359, 749), 16, WHITE)
    txt(d, (32, 563), '彩虹分布', 15, INK, bold=True)
    txt(d, (343, 565), '按颜色看你的节奏', 11, INK_FAINT, anchor='ra')

    palette = [('草莓红', '#FF6B6B', 4, 100), ('蜜橘橙', '#FFA94D', 2, 50), ('柠檬黄', '#FFD43B', 1, 25), ('青草绿', '#51CF66', 2, 50), ('薄荷青', '#20C997', 0, 0), ('晴空蓝', '#4DABF7', 3, 75), ('葡萄紫', '#9775FA', 1, 25), ('樱花粉', '#F783AC', 0, 0)]
    y = 590
    for name, color, count, percent in palette:
        circle(d, 32, y + 9, 4.5, fill=hexa(color))
        txt(d, (45, y + 9), name, 12, INK_SOFT, anchor='lm')
        rect(d, (109, y + 5, 311, y + 12), 3.5, TRACK)
        if percent > 0:
            rect(d, (109, y + 5, 109 + 202 * percent / 100.0, y + 12), 3.5, hexa(color))
        txt(d, (343, y + 9), str(count), 11, INK_FAINT, anchor='rm')
        y += 18

    tab_bar(img, d, w, 1)


def make_phone(painter):
    phone = Image.new('RGBA', (u(PHONE_W), u(PHONE_H)), (0, 0, 0, 0))
    d = ImageDraw.Draw(phone)
    d.rounded_rectangle([0, 0, phone.size[0] - 1, phone.size[1] - 1], radius=u(44), fill=BG)
    painter(phone, d, PHONE_W)
    mask = Image.new('L', phone.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, phone.size[0] - 1, phone.size[1] - 1], radius=u(44), fill=255)
    phone.putalpha(mask)
    return phone


def place(board, x, y, painter):
    phone = make_phone(painter)
    mask = phone.getchannel('A').filter(ImageFilter.GaussianBlur(u(14))).point(lambda a: int(a * 0.24))
    shadow = Image.new('RGBA', phone.size, (38, 45, 82, 255))
    shadow.putalpha(mask)
    board.paste(shadow, (u(x), u(y + 10)), shadow)
    board.paste(phone, (u(x), u(y)), phone)


def main():
    board = Image.new('RGB', (u(BOARD_W), u(BOARD_H)), rgb('#eef1f8'))
    d = ImageDraw.Draw(board)

    title_x = PAD
    width = grad_text(board, (title_x, 42), '彩虹待办', 30, RAINBOW, bold=True)
    txt(d, (title_x + width + 10, 52), '· 界面预览', 22, INK, bold=False)
    txt(d, (PAD, 92), '微信小程序 · 3 个核心界面 · 375pt 逻辑宽度', 13, INK_SOFT)
    txt(d, (BOARD_W - PAD, 60), '颜色与间距取自真实 WXML / WXSS', 12, INK_FAINT, anchor='ra')

    top = PAD + HEADER_H
    painters = [draw_home, draw_editor, draw_stats]
    captions = ['01 · 首页', '02 · 新建 / 编辑', '03 · 统计']
    for i in range(3):
        x = PAD + i * (PHONE_W + GAP)
        place(board, x, top, painters[i])
        txt(d, (x + PHONE_W / 2.0, top + PHONE_H + 20), captions[i], 13, hexa('#6b7288'), bold=True, anchor='mm')

    os.makedirs(os.path.join(BASE, 'preview'), exist_ok=True)
    out = os.path.join(BASE, 'preview', 'design-board.png')
    board.save(out, quality=95)
    print('saved', out, board.size)


if __name__ == '__main__':
    main()
