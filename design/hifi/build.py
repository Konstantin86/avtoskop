"""Generates the Avtoskop high-fidelity screens (.dc.html) for the design canvas.

Run: python3 design/hifi/build.py design/hifi/screens
"""

import sys
from pathlib import Path

BG = "#F7F6F2"
SURFACE = "#FFFFFF"
INK = "#16181D"
MUTED = "#5C6070"
LINE = "#E6E3DC"
ACCENT = "#0057B7"
ACCENT_DARK = "#00448F"
ACCENT_SOFT = "#E6EEF8"
YELLOW = "#FFD500"
YELLOW_SOFT = "#FFF5C2"
YELLOW_INK = "#5C4A00"
GOOD = "#16794A"
GOOD_SOFT = "#E7F4EC"
WARN = "#A1420E"
WARN_SOFT = "#FBEDE3"
PHOTO = "#E9E6DF"
FONT = "'Fixel', system-ui, sans-serif"

CAR_SVG = (
    '<svg width="{w}" height="{h}" viewBox="0 0 120 60" fill="none" stroke="#BDB8AC" '
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    '<path d="M8 43h104M16 43l9-15c2-4 6-7 11-7h40c6 0 10 2 13 7l11 15"/>'
    '<path d="M38 21l-4 12h52l-4-12"/><circle cx="34" cy="45" r="7" fill="#E9E6DF"/>'
    '<circle cx="88" cy="45" r="7" fill="#E9E6DF"/></svg>'
)

LOGO_MARK = (
    f'<svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">'
    f'<rect width="28" height="28" rx="8" fill="{ACCENT}"/>'
    f'<circle cx="12.5" cy="12.5" r="5.5" stroke="{YELLOW}" stroke-width="2.4"/>'
    f'<path d="M16.6 16.6L21 21" stroke="{YELLOW}" stroke-width="2.4" stroke-linecap="round"/></svg>'
)

CHECK = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{ACCENT}" stroke-width="2.4" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
)

LOCK = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{ACCENT}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/>'
    f'<path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
)

SHIELD = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{ACCENT}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>'
    f'<path d="M9 12l2 2 4-4"/></svg>'
)

GAUGE = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{ACCENT}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16a8 8 0 1 1 16 0"/>'
    f'<path d="M12 16l4-5"/></svg>'
)

MENU = (
    f'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" '
    f'stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
)

BACK = (
    f'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'
)

TELEGRAM = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{ACCENT}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/>'
    f'<path d="M9 13l8-6"/></svg>'
)


FLAG_US = (
    '<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#FFFFFF"/>'
    '<g fill="#B22234"><rect width="20" height="2"/><rect y="4" width="20" height="2"/><rect y="8" width="20" height="2"/>'
    '<rect y="12" width="20" height="2"/></g><rect width="9" height="8" fill="#3C3B6E"/>'
    '<rect x="0.5" y="0.5" width="19" height="13" rx="1.5" fill="none" stroke="#16181D" stroke-opacity="0.15"/></svg>'
)

FLAG_EU = (
    '<svg width="20" height="14" viewBox="0 0 20 14" aria-hidden="true"><rect width="20" height="14" fill="#003399"/>'
    + "".join(
        f'<circle cx="{10 + 4.2 * __import__("math").cos(a * 0.5236):.2f}" cy="{7 + 4.2 * __import__("math").sin(a * 0.5236):.2f}" r="0.75" fill="#FFCC00"/>'
        for a in range(12)
    )
    + '</svg>'
)

STORE = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l2-6h14l2 6"/>'
    f'<path d="M4 10v10h16V10"/><path d="M10 20v-5h4v5"/></svg>'
)

PERSON = (
    f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="{INK}" stroke-width="2" '
    f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/>'
    f'<path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
)

SELLER_ICONS = {"us": FLAG_US, "eu": FLAG_EU, "dealer": STORE, "owner": PERSON}


def seller_badge(label: str, kind: str) -> str:
    return (
        f'<span style="display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 12px 0 10px; '
        f'border-radius: 999px; background: {SURFACE}; border: 1px solid {LINE}; font-size: 13px; font-weight: 600; '
        f'white-space: nowrap">{SELLER_ICONS[kind]}{label}</span>'
    )


FONT_FILES = {
    400: ("FixelText-Regular", "494eceda31233a708e9bb12f390eab44"),
    500: ("FixelText-Medium", "9288b6cc029454021d8d408db2a2f1f4"),
    600: ("FixelText-SemiBold", "273d8a362362363d8bfe89a7622784eb"),
    700: ("FixelDisplay-Bold", "4cde25ea017e5c6b99ce78e80a9b047d"),
}
FONT_MODE = "canvas"


def font_faces() -> str:
    def url(name: str, blob: str) -> str:
        return f"/_blob/{blob}" if FONT_MODE == "canvas" else f"fonts/{name}.woff2"

    return "".join(
        f"@font-face{{font-family:'Fixel';font-weight:{w};font-style:normal;font-display:swap;src:url({url(n, b)}) format('woff2')}}\n"
        for w, (n, b) in FONT_FILES.items()
    )


def page(title: str, width: int, height: int, body: str) -> str:
    return f"""<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
{font_faces()}
body{{margin:0;font-family:{FONT};background:{BG};color:{INK}}}
a{{color:{ACCENT}}}a:hover{{color:{ACCENT_DARK}}}
</style>
</helmet>
<div style="width: {width}px; height: {height}px; box-sizing: border-box; background: {BG}; font-family: {FONT}; color: {INK}; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{width},"height":{height}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
"""


def btn(label: str, href: str, size: str = "md", kind: str = "primary", full: bool = False) -> str:
    h = {"sm": 40, "md": 48, "lg": 56}[size]
    fs = {"sm": 14, "md": 15, "lg": 17}[size]
    pad = {"sm": 16, "md": 22, "lg": 28}[size]
    colors = {
        "primary": f"background: {YELLOW}; color: {INK}; border: 1px solid {YELLOW}",
        "blue": f"background: {ACCENT}; color: #FFFFFF; border: 1px solid {ACCENT}",
        "secondary": f"background: {SURFACE}; color: {INK}; border: 1px solid {LINE}",
        "ghost": f"background: transparent; color: {ACCENT}; border: 1px solid transparent",
    }[kind]
    width = "width: 100%; box-sizing: border-box;" if full else ""
    return (
        f'<a href="{href}" style="{width} height: {h}px; padding: 0 {pad}px; display: inline-flex; align-items: center; '
        f'justify-content: center; gap: 8px; border-radius: 12px; {colors}; text-decoration: none; font-weight: 600; '
        f'font-size: {fs}px; white-space: nowrap">{label}</a>'
    )


def header_desktop(active: str = "") -> str:
    def nav(label: str, href: str, key: str) -> str:
        color = INK if key == active else MUTED
        weight = 600 if key == active else 500
        return f'<a href="{href}" style="color: {color}; text-decoration: none; font-weight: {weight}">{label}</a>'

    return f"""<header style="height: 72px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 48px; border-bottom: 1px solid {LINE}; background: {BG}">
<a href="HiHome.dc.html" style="display: flex; align-items: center; gap: 10px; color: {INK}; text-decoration: none">{LOGO_MARK}<span style="font-size: 20px; font-weight: 700; letter-spacing: -0.01em">Автоскоп</span></a>
<nav style="display: flex; gap: 32px; font-size: 15px">
{nav("Пошук авто", "HiResults.dc.html", "search")}
{nav("Як це працює", "HiHome.dc.html", "how")}
{nav("Продавцям", "HiHome.dc.html", "sellers")}
</nav>
<div style="display: flex; align-items: center; gap: 20px; font-size: 15px">
<a href="HiOffers.dc.html" style="color: {MUTED}; text-decoration: none; font-weight: 500">Мої запити</a>
<span style="color: {MUTED}; font-weight: 500">UA · EN</span>
{btn("Залишити запит", "HiRequest.dc.html", "sm")}
</div>
</header>"""


def header_mobile(title: str = "", back: str = "") -> str:
    if back:
        left = f'<a href="{back}" aria-label="Назад" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center">{BACK}</a>'
        mid = f'<span style="font-size: 16px; font-weight: 600">{title}</span>'
        right = '<span style="width: 44px"></span>'
    else:
        left = f'<a href="HiHomeMobile.dc.html" style="display: flex; align-items: center; gap: 8px; color: {INK}; text-decoration: none; padding-left: 12px">{LOGO_MARK}<span style="font-size: 18px; font-weight: 700">Автоскоп</span></a>'
        mid = ""
        right = f'<button type="button" aria-label="Меню" style="width: 44px; height: 44px; border: 0; background: transparent; display: flex; align-items: center; justify-content: center">{MENU}</button>'
    return f"""<header style="height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 4px; border-bottom: 1px solid {LINE}; background: {BG}">
{left}{mid}{right}
</header>"""


def chip(label: str, tone: str = "neutral") -> str:
    style = {
        "neutral": f"background: {SURFACE}; color: {INK}; border: 1px solid {LINE}",
        "accent": f"background: {ACCENT_SOFT}; color: {ACCENT_DARK}; border: 1px solid {ACCENT_SOFT}",
        "yellow": f"background: {YELLOW_SOFT}; color: {YELLOW_INK}; border: 1px solid {YELLOW_SOFT}",
        "good": f"background: {GOOD_SOFT}; color: {GOOD}; border: 1px solid {GOOD_SOFT}",
        "warn": f"background: {WARN_SOFT}; color: {WARN}; border: 1px solid {WARN_SOFT}",
        "dark": f"background: {INK}; color: #FFFFFF; border: 1px solid {INK}",
    }[tone]
    return f'<span style="display: inline-flex; align-items: center; height: 28px; padding: 0 10px; border-radius: 999px; {style}; font-size: 13px; font-weight: 600; white-space: nowrap">{label}</span>'


def rating(score: int, size: int = 44) -> str:
    color = ACCENT if score >= 65 else (MUTED if score >= 50 else WARN)
    return f'<span style="width: {size}px; height: {size}px; flex-shrink: 0; border-radius: 12px; background: {color}; color: #FFFFFF; font-size: {round(size * 0.42)}px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center">{score}</span>'


def photo(height: int, radius: int = 12, svg_w: int = 120) -> str:
    return f'<div style="height: {height}px; border-radius: {radius}px; background: {PHOTO}; display: flex; align-items: center; justify-content: center">{CAR_SVG.format(w=svg_w, h=svg_w // 2)}</div>'


def field(label: str, value: str, placeholder: bool = False, hint: str = "") -> str:
    color = MUTED if placeholder else INK
    hint_html = f'<span style="font-size: 13px; color: {MUTED}">{hint}</span>' if hint else ""
    return f"""<label style="display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; color: {INK}">{label}
<span style="height: 50px; padding: 0 14px; display: flex; align-items: center; border: 1px solid {LINE}; border-radius: 12px; background: {SURFACE}; font-size: 16px; font-weight: 500; color: {color}">{value}</span>{hint_html}</label>"""


def choices(options: list[str], selected: set[int]) -> str:
    def one(i: int, o: str) -> str:
        on = i in selected
        style = (
            f"border: 1px solid {ACCENT}; background: {ACCENT_SOFT}; color: {ACCENT_DARK}"
            if on
            else f"border: 1px solid {LINE}; background: {SURFACE}; color: {INK}"
        )
        mark = "✓ " if on else ""
        return f'<span style="display: inline-flex; align-items: center; min-height: 40px; padding: 0 14px; border-radius: 999px; {style}; font-size: 14px; font-weight: 600">{mark}{o}</span>'

    return f'<div style="display: flex; flex-wrap: wrap; gap: 8px">{"".join(one(i, o) for i, o in enumerate(options))}</div>'


def segmented(options: list[str], selected: int) -> str:
    items = "".join(
        f'<span style="flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-size: 14px; font-weight: 600; '
        + (f"background: {SURFACE}; color: {INK}; box-shadow: 0 1px 2px rgba(22,24,29,0.08)" if i == selected else f"color: {MUTED}")
        + f'">{o}</span>'
        for i, o in enumerate(options)
    )
    return f'<div style="display: flex; gap: 4px; padding: 4px; border-radius: 14px; background: #EFEDE7">{items}</div>'


CARS = [
    dict(title="Toyota RAV4 2.5 Hybrid", meta="2021 · 48 тис. км · Київ", price="$27 900", label=("Нижче ринку", "good"), score=86, src="AUTO.RIA + OLX"),
    dict(title="Toyota RAV4 2.5 Hybrid", meta="2022 · 31 тис. км · Львів", price="$31 500", label=("Ринкова ціна", "neutral"), score=78, src="AUTO.RIA"),
    dict(title="Toyota RAV4 2.0", meta="2020 · 74 тис. км · Дніпро", price="$22 300", label=("Ринкова ціна", "neutral"), score=69, src="OLX"),
    dict(title="Toyota RAV4 2.5 Hybrid", meta="2019 · 96 тис. км · Одеса", price="$23 800", label=("Нижче ринку", "good"), score=64, src="AUTO.RIA"),
    dict(title="Toyota RAV4 Prime", meta="2021 · 52 тис. км · Київ", price="$33 900", label=("Мало даних", "neutral"), score=55, src="OLX"),
    dict(title="Toyota RAV4 2.5", meta="2019 · 88 тис. км · Харків", price="$25 600", label=("Вище ринку", "warn"), score=41, src="AUTO.RIA"),
]


def car_card(c: dict, href: str, photo_h: int = 190) -> str:
    return f"""<a href="{href}" style="display: flex; flex-direction: column; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 16px; overflow: hidden; text-decoration: none; color: {INK}">
<div style="position: relative">{photo(photo_h, 0)}<span style="position: absolute; top: 12px; left: 12px">{rating(c["score"], 40)}</span></div>
<div style="padding: 16px; display: flex; flex-direction: column; gap: 6px">
<span style="font-size: 16px; font-weight: 600">{c["title"]}</span>
<span style="font-size: 14px; color: {MUTED}">{c["meta"]}</span>
<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px"><span style="font-size: 20px; font-weight: 700">{c["price"]}</span>{chip(*c["label"])}</div>
<span style="font-size: 12px; color: {MUTED}">{c["src"]}</span>
</div>
</a>"""


# ---------- Home ----------

def request_card(pad: int, title_size: int, href: str) -> str:
    return f"""<form style="background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px; padding: {pad}px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 12px 32px rgba(22,24,29,0.06)">
<div style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: {title_size}px; font-weight: 700">Який автомобіль шукаєте?</span><span style="font-size: 14px; color: {MUTED}">Продавці надішлють пропозиції під ваш запит</span></div>
{field("Марка і модель", "Toyota RAV4")}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">{field("Рік від", "2019")}{field("Бюджет до", "$28 000")}</div>
{field("Регіон", "Київ і область")}
{btn("Отримати пропозиції", href, "lg", full=True)}
<span style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: {MUTED}">{LOCK}Безкоштовно. Номер прихований від продавців</span>
</form>"""


def steps(direction: str, gap: int) -> str:
    items = [
        ("1", "Опишіть авто", "Модель, роки, бюджет і регіон. Дві хвилини."),
        ("2", "Отримайте пропозиції", "Імпортери, дилери та власники пропонують варіанти."),
        ("3", "Оберіть, з ким говорити", "Номер бачать лише ті, кому ви його відкриєте."),
    ]
    cells = "".join(
        f"""<div style="flex: 1; display: flex; flex-direction: column; gap: 10px; padding: 24px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 16px">
<span style="width: 36px; height: 36px; border-radius: 10px; background: {ACCENT_SOFT}; color: {ACCENT_DARK}; font-weight: 700; display: flex; align-items: center; justify-content: center">{n}</span>
<span style="font-size: 18px; font-weight: 600">{t}</span><span style="font-size: 15px; color: {MUTED}; line-height: 1.5">{d}</span></div>"""
        for n, t, d in items
    )
    return f'<div style="display: flex; flex-direction: {direction}; gap: {gap}px">{cells}</div>'


def trust(direction: str) -> str:
    items = [
        (LOCK, "Номер прихований", "Продавці не дзвонять без вашої згоди"),
        (SHIELD, "Перевірені продавці", "Імпортери й дилери проходять перевірку"),
        (GAUGE, "Оцінка ціни", "Кожну пропозицію порівнюємо з ринком"),
    ]
    cells = "".join(
        f'<div style="flex: 1; display: flex; gap: 12px; align-items: flex-start">{i}<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; font-weight: 600">{t}</span><span style="font-size: 14px; color: {MUTED}">{d}</span></div></div>'
        for i, t, d in items
    )
    return f'<div style="display: flex; flex-direction: {direction}; gap: 20px">{cells}</div>'


def home_desktop() -> str:
    body = f"""{header_desktop("how")}
<main style="padding: 72px 48px 80px; display: flex; flex-direction: column; gap: 72px">
<section style="display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 64px; align-items: center">
<div style="display: flex; flex-direction: column; gap: 24px">
<div>{chip("Для покупців авто в Україні", "yellow")}</div>
<h1 style="margin: 0; font-size: 52px; line-height: 1.05; font-weight: 700; letter-spacing: -0.025em">Опишіть авто —<br>продавці запропонують варіанти</h1>
<p style="margin: 0; font-size: 19px; line-height: 1.55; color: {MUTED}; max-width: 560px">Імпортери, дилери та власники надсилають пропозиції під ваш запит. Ви порівнюєте їх з ринком і самі вирішуєте, кому відкрити номер.</p>
<div style="display: flex; align-items: center; gap: 16px">{btn("Залишити запит", "HiRequest.dc.html", "lg")}{btn("Шукати серед оголошень", "HiResults.dc.html", "lg", "secondary")}</div>
<span style="font-size: 14px; color: {MUTED}">Оголошення з AUTO.RIA, OLX та від дилерів — в одному пошуку</span>
</div>
{request_card(28, 22, "HiRequestSent.dc.html")}
</section>
<section style="display: flex; flex-direction: column; gap: 24px">
<h2 style="margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.015em">Як це працює</h2>
{steps("row", 20)}
</section>
<section style="padding: 32px; border-radius: 20px; background: #EFEDE7">{trust("row")}</section>
</main>
<footer style="padding: 28px 48px; border-top: 1px solid {LINE}; display: flex; justify-content: space-between; font-size: 14px; color: {MUTED}"><span>© Автоскоп, 2026</span><span>Дані оголошень: AUTO.RIA, OLX</span></footer>"""
    return page("Автоскоп — головна", 1280, 1300, body)


def home_mobile() -> str:
    body = f"""{header_mobile()}
<main style="padding: 28px 16px 40px; display: flex; flex-direction: column; gap: 32px">
<div style="display: flex; flex-direction: column; gap: 16px">
<div>{chip("Для покупців авто в Україні", "yellow")}</div>
<h1 style="margin: 0; font-size: 30px; line-height: 1.15; font-weight: 700; letter-spacing: -0.02em">Опишіть авто — продавці запропонують варіанти</h1>
<p style="margin: 0; font-size: 16px; line-height: 1.55; color: {MUTED}">Імпортери, дилери та власники надсилають пропозиції. Ви самі вирішуєте, кому відкрити номер.</p>
</div>
{request_card(20, 19, "HiRequestSentMobile.dc.html")}
{btn("Шукати серед оголошень", "HiResultsMobile.dc.html", "md", "secondary", True)}
<section style="display: flex; flex-direction: column; gap: 16px"><h2 style="margin: 0; font-size: 24px; font-weight: 700">Як це працює</h2>{steps("column", 12)}</section>
<section style="padding: 20px; border-radius: 16px; background: #EFEDE7">{trust("column")}</section>
</main>"""
    return page("Автоскоп — головна, мобільна", 390, 1880, body)


# ---------- Results ----------

def request_banner(compact: bool, href: str) -> str:
    direction = "column" if compact else "row"
    align = "stretch" if compact else "center"
    return f"""<div style="display: flex; flex-direction: {direction}; align-items: {align}; justify-content: space-between; gap: 16px; padding: {20 if compact else 24}px; border-radius: 16px; background: {YELLOW_SOFT}">
<div style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: {17 if compact else 19}px; font-weight: 700; color: {INK}">Не знайшли ідеальний варіант?</span><span style="font-size: 15px; color: {MUTED}">Опишіть, що шукаєте — імпортери й дилери запропонують авто, яких ще немає в оголошеннях.</span></div>
{btn("Залишити запит", href, "md", full=compact)}
</div>"""


def results_desktop() -> str:
    cards = "".join(car_card(c, "HiCar.dc.html") for c in CARS)
    filters = "".join(chip(x) for x in ["2019 і новіші", "Гібрид", "До $35 000", "Київ і область"])
    body = f"""{header_desktop("search")}
<main style="padding: 32px 48px 64px; display: flex; flex-direction: column; gap: 24px">
<div style="display: flex; align-items: flex-end; justify-content: space-between">
<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; color: {MUTED}">Легкові · Toyota</span><h1 style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: -0.02em">Toyota RAV4 <span style="color: {MUTED}; font-weight: 500">· 1 840 оголошень</span></h1></div>
<label style="display: flex; align-items: center; gap: 10px; font-size: 14px; color: {MUTED}">Сортувати<span style="height: 40px; padding: 0 14px; display: flex; align-items: center; gap: 8px; border: 1px solid {LINE}; border-radius: 12px; background: {SURFACE}; color: {INK}; font-weight: 600">За рейтингом ▾</span></label>
</div>
<div style="display: flex; align-items: center; gap: 8px">{filters}<span style="display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; border: 1px dashed #C9C5BB; font-size: 13px; font-weight: 600; color: {INK}">+ Фільтри</span></div>
{request_banner(False, "HiRequest.dc.html")}
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px">{cards}</div>
</main>"""
    return page("Автоскоп — пошук", 1280, 1160, body)


def results_mobile() -> str:
    cards = "".join(car_card(c, "HiCarMobile.dc.html", 200) for c in CARS[:4])
    filters = "".join(chip(x) for x in ["2019+", "Гібрид", "До $35k"])
    body = f"""{header_mobile()}
<main style="padding: 20px 16px 40px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; flex-direction: column; gap: 4px"><span style="font-size: 13px; color: {MUTED}">Легкові · Toyota</span><h1 style="margin: 0; font-size: 28px; font-weight: 700">Toyota RAV4</h1><span style="font-size: 14px; color: {MUTED}">1 840 оголошень · за рейтингом</span></div>
<div style="display: flex; gap: 8px; overflow: hidden">{filters}<span style="display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; border: 1px dashed #C9C5BB; font-size: 13px; font-weight: 600">+ Фільтри</span></div>
{request_banner(True, "HiRequestMobile.dc.html")}
{cards}
</main>"""
    return page("Автоскоп — пошук, мобільна", 390, 1940, body)


# ---------- Request form ----------

def request_form_fields() -> str:
    return f"""<div style="display: flex; flex-direction: column; gap: 14px">
<span style="font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: {MUTED}">Авто</span>
{field("Марка і модель", "Toyota RAV4", hint="Можна додати ще моделі, наприклад Honda CR-V")}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">{field("Рік від", "2019")}{field("Рік до", "Будь-який", True)}</div>
<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">Паливо</span>{segmented(["Будь-яке", "Гібрид", "Бензин", "Дизель"], 1)}</div>
<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">Коробка передач</span>{segmented(["Будь-яка", "Автомат", "Механіка"], 1)}</div>
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
<span style="font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: {MUTED}">Бюджет і місце</span>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">{field("Бюджет до", "$28 000")}{field("Пробіг до", "100 тис. км")}</div>
{field("Регіон", "Київ і область")}
<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">Імпорт з-за кордону</span>{segmented(["Підходить", "Лише в Україні"], 0)}</div>
<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 14px; font-weight: 600">Що для вас важливо</span>{choices(["Без ДТП", "Один власник", "Сервісна історія", "Не з аукціону", "Повний привід"], {0, 2})}</div>
{field("Побажання", "Колір, комплектація, інше…", True)}
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
<span style="font-size: 13px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: {MUTED}">Як з вами зв'язатися</span>
{field("Телефон", "+380 •• ••• •• ••", True, "Підтвердимо одним SMS. Продавці не бачать номер")}
<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; font-weight: 600">Сповіщення про пропозиції</span>{segmented(["Telegram", "SMS", "Email"], 0)}</div>
</div>"""


def request_summary() -> str:
    rows = "".join(
        f'<div style="display: flex; justify-content: space-between; font-size: 15px"><span style="color: {MUTED}">{k}</span><span style="font-weight: 600">{v}</span></div>'
        for k, v in [("Модель", "Toyota RAV4"), ("Роки", "2019 і новіші"), ("Паливо", "Гібрид"), ("Коробка", "Автомат"), ("Бюджет", "до $28 000"), ("Регіон", "Київ і область"), ("Важливо", "Без ДТП, сервісна історія")]
    )
    return f"""<aside style="display: flex; flex-direction: column; gap: 16px; padding: 24px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">
<span style="font-size: 18px; font-weight: 700">Ваш запит</span>{rows}
<div style="height: 1px; background: {LINE}"></div>
<span style="font-size: 15px; font-weight: 600">Хто побачить запит</span>
<div style="display: flex; flex-wrap: wrap; gap: 8px">{chip("Імпортери", "accent")}{chip("Дилери", "accent")}{chip("Автовикуп", "accent")}{chip("Власники", "accent")}</div>
<span style="display: flex; gap: 8px; font-size: 14px; color: {MUTED}; line-height: 1.5">{LOCK}Ваш номер прихований. Ви відкриєте його лише тим продавцям, яких оберете.</span>
</aside>"""


def request_desktop() -> str:
    body = f"""{header_desktop()}
<main style="padding: 40px 48px 64px; display: flex; flex-direction: column; gap: 28px">
<div style="display: flex; flex-direction: column; gap: 8px"><a href="HiResults.dc.html" style="font-size: 14px; color: {MUTED}; text-decoration: none">← До пошуку</a><h1 style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: -0.02em">Опишіть авто, яке шукаєте</h1><p style="margin: 0; font-size: 17px; color: {MUTED}">Чим точніше запит, тим кращі пропозиції.</p></div>
<div style="display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 40px; align-items: start">
<form style="display: flex; flex-direction: column; gap: 32px; padding: 32px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">
{request_form_fields()}
{btn("Опублікувати запит", "HiRequestSent.dc.html", "lg", full=True)}
<span style="font-size: 13px; color: {MUTED}; text-align: center">Публікуючи запит, ви погоджуєтеся з <a href="#">умовами</a> та <a href="#">політикою конфіденційності</a></span>
</form>
{request_summary()}
</div>
</main>"""
    return page("Автоскоп — новий запит", 1280, 1680, body)


def request_mobile() -> str:
    body = f"""{header_mobile("Новий запит", "HiResultsMobile.dc.html")}
<main style="padding: 20px 16px 120px; display: flex; flex-direction: column; gap: 28px">
<div style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.015em">Опишіть авто, яке шукаєте</h1><p style="margin: 0; font-size: 15px; color: {MUTED}">Чим точніше запит, тим кращі пропозиції.</p></div>
<form style="display: flex; flex-direction: column; gap: 28px">{request_form_fields()}</form>
<span style="display: flex; gap: 8px; font-size: 14px; color: {MUTED}; line-height: 1.5">{LOCK}Номер прихований. Ви відкриєте його лише обраним продавцям.</span>
</main>
<div style="position: sticky; bottom: 0; margin-top: auto; padding: 12px 16px 24px; background: {BG}; border-top: 1px solid {LINE}">{btn("Опублікувати запит", "HiRequestSentMobile.dc.html", "lg", full=True)}</div>"""
    return page("Автоскоп — новий запит, мобільна", 390, 1760, body)


# ---------- Request sent ----------

def sent_content(mobile: bool) -> str:
    timeline = [
        ("done", "Запит опубліковано", "Сьогодні, 14:20"),
        ("done", "Надіслано перевіреним продавцям", "Імпортери, дилери, автовикуп"),
        ("now", "Чекаємо на пропозиції", "Повідомимо в Telegram, щойно з'явиться перша"),
        ("next", "Ви обираєте, кому відкрити номер", "Без дзвінків від тих, кого ви не обрали"),
    ]
    rows = ""
    for state, title, sub in timeline:
        dot = {
            "done": f'<span style="width: 28px; height: 28px; border-radius: 999px; background: {ACCENT}; display: flex; align-items: center; justify-content: center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>',
            "now": f'<span style="width: 28px; height: 28px; border-radius: 999px; border: 2px solid {ACCENT}; box-sizing: border-box; display: flex; align-items: center; justify-content: center"><span style="width: 10px; height: 10px; border-radius: 999px; background: {ACCENT}"></span></span>',
            "next": f'<span style="width: 28px; height: 28px; border-radius: 999px; border: 2px solid {LINE}; box-sizing: border-box"></span>',
        }[state]
        rows += f'<div style="display: flex; gap: 14px; align-items: flex-start">{dot}<div style="display: flex; flex-direction: column; gap: 2px; padding-top: 3px"><span style="font-size: 16px; font-weight: 600">{title}</span><span style="font-size: 14px; color: {MUTED}">{sub}</span></div></div>'
    title_size = 30 if mobile else 44
    suffix = "Mobile" if mobile else ""
    return f"""<div style="display: flex; flex-direction: column; align-items: {'flex-start' if mobile else 'center'}; gap: 14px; text-align: {'left' if mobile else 'center'}">
<span style="width: 56px; height: 56px; border-radius: 16px; background: {ACCENT_SOFT}; display: flex; align-items: center; justify-content: center"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="{ACCENT}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
<h1 style="margin: 0; font-size: {title_size}px; font-weight: 700; letter-spacing: -0.02em">Запит опубліковано</h1>
<p style="margin: 0; font-size: 17px; color: {MUTED}; max-width: 520px; line-height: 1.5">Toyota RAV4 · 2019+ · гібрид · автомат · до $28 000 · Київ · без ДТП · сервісна історія</p>
</div>
<div style="display: flex; flex-direction: column; gap: 20px; padding: 28px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">{rows}</div>
<div style="display: flex; align-items: center; gap: 14px; padding: 20px; border-radius: 16px; background: {ACCENT_SOFT}">{TELEGRAM}<div style="display: flex; flex-direction: column; gap: 2px; flex: 1"><span style="font-size: 15px; font-weight: 600">Підключіть Telegram</span><span style="font-size: 14px; color: {MUTED}">Пропозиції приходитимуть одразу</span></div>{btn("Підключити", "#", "sm", "blue")}</div>
<div style="display: flex; flex-direction: {'column' if mobile else 'row'}; gap: 12px; justify-content: center">{btn("Мої запити", f"HiOffers{suffix}.dc.html", "md", "blue", full=mobile)}{btn("Поки що подивитися оголошення", f"HiResults{suffix}.dc.html", "md", "secondary", full=mobile)}</div>"""


def sent_desktop() -> str:
    body = f"""{header_desktop()}
<main style="padding: 72px 48px; display: flex; justify-content: center"><div style="width: 620px; display: flex; flex-direction: column; gap: 28px">{sent_content(False)}</div></main>"""
    return page("Автоскоп — запит опубліковано", 1280, 940, body)


def sent_mobile() -> str:
    body = f"""{header_mobile()}
<main style="padding: 32px 16px 40px; display: flex; flex-direction: column; gap: 24px">{sent_content(True)}</main>"""
    return page("Автоскоп — запит опубліковано, мобільна", 390, 960, body)


# ---------- Offers ----------

OFFERS = [
    dict(seller="Імпорт з США", kind="us", who="Перевірений імпортер · 4.8 ★ · 37 угод", car="Toyota RAV4 2.5 Hybrid XLE, 2020", meta="61 тис. км · без серйозних пошкоджень · фото з аукціону", where="У дорозі, 4–6 тижнів до Києва", price="$25 900", note="під ключ, з розмитненням", label=("На 7% нижче ринку", "good"), score=84),
    dict(seller="Дилер", kind="dealer", who="Офіційний дилер · Київ", car="Toyota RAV4 2.5 Hybrid, 2021", meta="44 тис. км · сервісна історія у дилера", where="В наявності, Київ", price="$28 400", note="можливий трейд-ін", label=("Ринкова ціна", "neutral"), score=79),
    dict(seller="Власник", kind="owner", who="Приватний продавець · номер перевірено", car="Toyota RAV4 2.5 Hybrid, 2019", meta="88 тис. км · один власник в Україні", where="Бровари", price="$23 500", note="торг біля авто", label=("Ринкова ціна", "neutral"), score=66),
]


def offer_card(o: dict, compact: bool) -> str:
    actions_dir = "column" if compact else "row"
    return f"""<article style="display: flex; flex-direction: {'column' if compact else 'row'}; gap: 20px; padding: 20px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">
<div style="{'width: 100%' if compact else 'width: 220px; flex-shrink: 0'}">{photo(160 if compact else 150, 14, 100)}</div>
<div style="flex: 1; display: flex; flex-direction: column; gap: 8px">
<div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">{seller_badge(o["seller"], o["kind"])}<span style="font-size: 13px; color: {MUTED}">{o["who"]}</span></div>
<span style="font-size: 18px; font-weight: 600">{o["car"]}</span>
<span style="font-size: 14px; color: {MUTED}">{o["meta"]}</span>
<span style="font-size: 14px; font-weight: 500">{o["where"]}</span>
<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px"><span style="font-size: 24px; font-weight: 700">{o["price"]}</span><span style="font-size: 13px; color: {MUTED}">{o["note"]}</span>{chip(*o["label"])}</div>
</div>
<div style="display: flex; flex-direction: {actions_dir}; {'' if compact else 'flex-direction: column; width: 220px; flex-shrink: 0;'} gap: 10px; justify-content: center">
<div style="display: flex; align-items: center; gap: 10px">{rating(o["score"], 40)}<span style="font-size: 13px; color: {MUTED}">Оцінка Автоскопа</span></div>
{btn("Відкрити номер", "#", "md", "blue", full=True)}
{btn("Відхилити", "#", "md", "secondary", full=True)}
</div>
</article>"""


def request_status_card(mobile: bool) -> str:
    return f"""<div style="display: flex; flex-direction: column; gap: 12px; padding: 20px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">
<div style="display: flex; align-items: center; justify-content: space-between">{chip("Активний", "good")}<a href="#" style="font-size: 14px; font-weight: 600; text-decoration: none">Змінити</a></div>
<span style="font-size: 20px; font-weight: 700">Toyota RAV4</span>
<span style="font-size: 15px; color: {MUTED}; line-height: 1.5">2019+ · гібрид · автомат · до $28 000 · Київ і область · без ДТП · сервісна історія</span>
<div style="height: 1px; background: {LINE}"></div>
<div style="display: flex; justify-content: space-between; font-size: 15px"><span style="color: {MUTED}">Пропозицій</span><span style="font-weight: 600">3</span></div>
<div style="display: flex; justify-content: space-between; font-size: 15px"><span style="color: {MUTED}">Номер відкрито</span><span style="font-weight: 600">0 продавцям</span></div>
<span style="display: flex; gap: 8px; font-size: 13px; color: {MUTED}">{LOCK}Продавці бачать запит без ваших контактів</span>
</div>"""


def offers_desktop() -> str:
    cards = "".join(offer_card(o, False) for o in OFFERS)
    body = f"""{header_desktop()}
<main style="padding: 40px 48px 64px; display: flex; flex-direction: column; gap: 28px">
<div style="display: flex; align-items: flex-end; justify-content: space-between"><div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 14px; color: {MUTED}">Мої запити</span><h1 style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: -0.02em">3 пропозиції на ваш запит</h1></div><span style="font-size: 14px; color: {MUTED}">Відсортовано за оцінкою</span></div>
<div style="display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 32px; align-items: start">
{request_status_card(False)}
<div style="display: flex; flex-direction: column; gap: 16px">{cards}</div>
</div>
</main>"""
    return page("Автоскоп — пропозиції", 1280, 1100, body)


def offers_mobile() -> str:
    cards = "".join(offer_card(o, True) for o in OFFERS[:2])
    body = f"""{header_mobile("Мої запити", "HiHomeMobile.dc.html")}
<main style="padding: 20px 16px 40px; display: flex; flex-direction: column; gap: 16px">
<h1 style="margin: 0; font-size: 28px; font-weight: 700">3 пропозиції</h1>
{request_status_card(True)}
{cards}
</main>"""
    return page("Автоскоп — пропозиції, мобільна", 390, 1740, body)


# ---------- Car ----------

def rating_block() -> str:
    parts = [("Ціна", 31, 35), ("Пробіг для віку", 12, 15), ("Історія і довіра", 22, 25), ("Поведінка оголошення", 12, 15), ("Якість оголошення", 9, 10)]
    bars = "".join(
        f'<div style="display: flex; flex-direction: column; gap: 6px"><div style="display: flex; justify-content: space-between; font-size: 14px"><span>{n}</span><span style="color: {MUTED}">{a} / {b}</span></div><div style="height: 6px; border-radius: 999px; background: #EFEDE7"><div style="width: {round(a / b * 100)}%; height: 6px; border-radius: 999px; background: {ACCENT}"></div></div></div>'
        for n, a, b in parts
    )
    reasons = "".join(
        f'<span style="display: flex; gap: 8px; align-items: center; font-size: 15px">{CHECK}{r}</span>'
        for r in ["На 11% дешевше схожих авто", "VIN перевірено на AUTO.RIA", "Пробіг збігається з попередніми оголошеннями"]
    )
    return f"""<section style="display: flex; flex-direction: column; gap: 16px; padding: 24px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">
<div style="display: flex; align-items: center; gap: 14px">{rating(86, 56)}<div style="display: flex; flex-direction: column; gap: 2px"><span style="font-size: 18px; font-weight: 700">Відмінна пропозиція</span><span style="font-size: 14px; color: {MUTED}">Оцінка Автоскопа · висока точність</span></div></div>
<div style="display: flex; flex-direction: column; gap: 8px">{reasons}</div>
<div style="height: 1px; background: {LINE}"></div>{bars}
</section>"""


def price_block() -> str:
    return f"""<section style="display: flex; flex-direction: column; gap: 14px; padding: 24px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px">
<div style="display: flex; align-items: center; justify-content: space-between"><span style="font-size: 32px; font-weight: 700">$27 900</span>{chip("Нижче ринку", "good")}</div>
<div style="position: relative; height: 8px; border-radius: 999px; background: #EFEDE7"><div style="position: absolute; left: 30%; width: 40%; height: 8px; border-radius: 999px; background: {ACCENT_SOFT}"></div><div style="position: absolute; left: 24%; top: -5px; width: 4px; height: 18px; border-radius: 2px; background: {ACCENT}"></div></div>
<div style="display: flex; justify-content: space-between; font-size: 13px; color: {MUTED}"><span>$24 500</span><span>типово $29 800–32 600</span><span>$36 000</span></div>
<span style="font-size: 14px; color: {MUTED}; line-height: 1.5">Порівняно з 46 схожими RAV4 Hybrid 2020–2022 з пробігом 35–60 тис. км</span>
</section>"""


def facts(cols: int) -> str:
    items = [("Рік", "2021"), ("Пробіг", "48 тис. км"), ("Двигун", "2.5 гібрид"), ("Привід", "Повний"), ("Коробка", "Варіатор"), ("Походження", "Куплений в Україні"), ("VIN", "JTMD•••••••803"), ("Розмитнений", "Так")]
    cells = "".join(
        f'<div style="display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; background: {SURFACE}"><span style="font-size: 13px; color: {MUTED}">{k}</span><span style="font-size: 15px; font-weight: 600">{v}</span></div>'
        for k, v in items
    )
    return f'<div style="display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); gap: 1px; background: {LINE}; border: 1px solid {LINE}; border-radius: 16px; overflow: hidden">{cells}</div>'


def car_desktop() -> str:
    thumbs = "".join(f'<div style="flex: 1">{photo(76, 10, 60)}</div>' for _ in range(5))
    body = f"""{header_desktop("search")}
<main style="padding: 28px 48px 64px; display: flex; flex-direction: column; gap: 20px">
<a href="HiResults.dc.html" style="font-size: 14px; color: {MUTED}; text-decoration: none">← Toyota RAV4 · 1 840 оголошень</a>
<div style="display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 32px; align-items: start">
<div style="display: flex; flex-direction: column; gap: 20px">
<div style="display: flex; flex-direction: column; gap: 8px">{photo(440, 20, 220)}<div style="display: flex; gap: 8px">{thumbs}</div></div>
<div style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.02em">Toyota RAV4 2.5 Hybrid, 2021</h1><span style="font-size: 16px; color: {MUTED}">48 тис. км · Київ · оновлено сьогодні</span></div>
{facts(4)}
<section style="display: flex; flex-direction: column; gap: 10px; padding: 24px; background: {SURFACE}; border: 1px solid {LINE}; border-radius: 20px"><span style="font-size: 18px; font-weight: 700">Де продається</span>
<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid {LINE}; font-size: 15px"><span><b>AUTO.RIA</b> · VIN перевірено</span><span style="font-weight: 600">$27 900</span><a href="#" style="font-weight: 600; text-decoration: none">Відкрити ↗</a></div>
<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; font-size: 15px"><span><b>OLX</b></span><span style="font-weight: 600">$28 200</span><a href="#" style="font-weight: 600; text-decoration: none">Відкрити ↗</a></div></section>
</div>
<div style="display: flex; flex-direction: column; gap: 16px">
{price_block()}
{rating_block()}
<section style="display: flex; flex-direction: column; gap: 12px; padding: 24px; border-radius: 20px; background: {YELLOW_SOFT}"><span style="font-size: 17px; font-weight: 700">Хочете схожу, але дешевше?</span><span style="font-size: 15px; color: {MUTED}">Залиште запит — імпортери й дилери запропонують варіанти.</span>{btn("Залишити запит на RAV4", "HiRequest.dc.html", "md", full=True)}</section>
{btn("Перевірити історію авто", "#", "md", "secondary", full=True)}
</div>
</div>
</main>"""
    return page("Автоскоп — авто", 1280, 1200, body)


def car_mobile() -> str:
    body = f"""{header_mobile("Toyota RAV4", "HiResultsMobile.dc.html")}
{photo(280, 0, 160)}
<main style="padding: 20px 16px 120px; display: flex; flex-direction: column; gap: 16px">
<div style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 26px; font-weight: 700">Toyota RAV4 2.5 Hybrid, 2021</h1><span style="font-size: 15px; color: {MUTED}">48 тис. км · Київ</span></div>
{price_block()}
{rating_block()}
{facts(2)}
<section style="display: flex; flex-direction: column; gap: 12px; padding: 20px; border-radius: 20px; background: {YELLOW_SOFT}"><span style="font-size: 17px; font-weight: 700">Хочете схожу, але дешевше?</span><span style="font-size: 15px; color: {MUTED}">Залиште запит — продавці запропонують варіанти.</span>{btn("Залишити запит", "HiRequestMobile.dc.html", "md", full=True)}</section>
</main>
<div style="position: sticky; bottom: 0; margin-top: auto; padding: 12px 16px 24px; display: flex; gap: 12px; align-items: center; background: {BG}; border-top: 1px solid {LINE}"><div style="display: flex; flex-direction: column"><span style="font-size: 20px; font-weight: 700">$27 900</span><span style="font-size: 13px; color: {GOOD}; font-weight: 600">Нижче ринку</span></div><div style="flex: 1">{btn("Відкрити на AUTO.RIA", "#", "lg", "blue", full=True)}</div></div>"""
    return page("Автоскоп — авто, мобільна", 390, 1880, body)


SCREENS = {
    "HiHome": home_desktop,
    "HiHomeMobile": home_mobile,
    "HiResults": results_desktop,
    "HiResultsMobile": results_mobile,
    "HiRequest": request_desktop,
    "HiRequestMobile": request_mobile,
    "HiRequestSent": sent_desktop,
    "HiRequestSentMobile": sent_mobile,
    "HiOffers": offers_desktop,
    "HiOffersMobile": offers_mobile,
    "HiCar": car_desktop,
    "HiCarMobile": car_mobile,
}

if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parent / "screens")
    if "--local-fonts" in sys.argv:
        FONT_MODE = "local"
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in SCREENS.items():
        (out / f"{name}.dc.html").write_text(fn())
    print(f"Wrote {len(SCREENS)} screens to {out}")
