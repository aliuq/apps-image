#!/usr/bin/env python3
"""补齐六个可自存的扩展栏目：表情、历代、场景、光影、道具、家具。

上游 build.py 要求这些栏目已存在于 POSEWEAR_RAW，但其生成脚本
scripts/prep-modules.py 依赖作者本地档案（不在仓库，也不公开下载）。本脚本改为
从上游部署站读取已发布的数据与图片，写入 POSEWEAR_RAW，供公共镜像构建使用。

只处理可自存的六个栏目。CharaDB 的发型与 440 套动画服装不在本脚本范围内：
上游明确要求这两部分只能热链、禁止下载再分发。

数据与图片按文件缓存，可重复执行；已存在且校验通过的 WebP 不会重复下载。
"""

from __future__ import annotations

import http.client
import json
import os
import re
import ssl
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit

BASE = os.environ.get('POSEWEAR_MODULES_BASE', 'https://posewear.pages.dev')
IMG = os.environ.get('POSEWEAR_MODULES_IMG', 'https://pwimg.0vo.pro')
RAW = os.path.abspath(os.environ.get('POSEWEAR_RAW', 'assets-raw'))
WORKERS = 6
EXPECT = {'expression': 95, 'dynasty': 57, 'scene': 64, 'light': 50, 'prop': 32, 'furn': 41}

MODULES = [
    {'key': 'expressions', 'pre': 'e', 'sub': 'expression', 'extra': ['emo', 'emoEn', 'int', 'intEn', 'code']},
    {'key': 'dynasties', 'pre': 'y', 'sub': 'dynasty', 'extra': ['era', 'eraEn', 'gender']},
    {'key': 'scenes', 'pre': 's', 'sub': 'scene', 'extra': ['light']},
    {'key': 'lights', 'pre': 'l', 'sub': 'light', 'extra': ['setting']},
    {'key': 'props', 'pre': 't', 'sub': 'prop', 'extra': []},
    {'key': 'furniture', 'pre': 'f', 'sub': 'furn', 'extra': ['dims']},
]
# 上游 depthpack/VM 的视角键，按中文视角名反查。
VIEW_KEY = {
    '正面': 'front', '斜侧': 'diag', '侧面': 'side', '背面': 'back',
    '俯视': 'above', '仰视': 'below', '平视': 'eye', '3/4 侧': 'tq',
}

local = threading.local()
lock = threading.Lock()
stats = {'ok': 0, 'skip': 0, 'fail': 0}


def _conn(host: str):
    if not hasattr(local, 'conns'):
        local.conns = {}
    conn = local.conns.get(host)
    if conn is None:
        conn = http.client.HTTPSConnection(host, timeout=60, context=ssl.create_default_context())
        local.conns[host] = conn
    return conn


def get(url: str, binary: bool = False) -> bytes | None:
    """GET with keep-alive per thread; returns None on 404/failure."""
    u = urlsplit(url)
    for attempt in range(4):
        conn = None
        try:
            conn = _conn(u.netloc)
            conn.request('GET', u.path, headers={'User-Agent': 'PoseWear public build'})
            res = conn.getresponse()
            data = res.read()
            if res.status == 200:
                return data
            if res.status == 404:
                return None
        except Exception:
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
                local.conns.pop(u.netloc, None)
        time.sleep(1 + attempt * 2)
    return None


def valid_webp(path: str) -> bool:
    try:
        with open(path, 'rb') as f:
            head = f.read(12)
        return len(head) == 12 and head[:4] == b'RIFF' and head[8:12] == b'WEBP'
    except OSError:
        return False


def download(urls: list[str], dest: str) -> bool:
    if os.path.isfile(dest) and valid_webp(dest):
        with lock:
            stats['skip'] += 1
        return True
    data = None
    for url in urls:
        data = get(url)
        if data and data[:4] == b'RIFF' and data[8:12] == b'WEBP':
            break
        data = None
    if not data:
        with lock:
            stats['fail'] += 1
        print(f'fetch-modules: FAILED {dest}', file=sys.stderr)
        return False
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + '.part'
    open(tmp, 'wb').write(data)
    os.replace(tmp, dest)
    with lock:
        stats['ok'] += 1
    return True


def discover(key: str) -> str:
    """从部署站首页 + app.js 找到当前数据集哈希地址。"""
    index = get(BASE + '/')
    if not index:
        raise SystemExit('fetch-modules: cannot read ' + BASE + '/')
    app = re.search(rb'/assets/app\.[a-f0-9]+\.js', index)
    if not app:
        raise SystemExit('fetch-modules: app.js not found in index')
    js = get(BASE + app.group(0).decode())
    if not js:
        raise SystemExit('fetch-modules: cannot read app.js')
    m = re.search(rb"'/assets/" + key.encode() + rb"\.[a-f0-9]+\.json'", js)
    if not m:
        raise SystemExit(f'fetch-modules: dataset {key} not found in app.js')
    return m.group(0).decode().strip("'")


def load_data(mod: dict, refresh: bool) -> list[dict]:
    path = os.path.join(RAW, mod['sub'], 'data.json')
    if os.path.isfile(path) and not refresh:
        data = json.load(open(path, encoding='utf-8'))
        if len(data) == EXPECT[mod['sub']]:
            return data
    url = discover(mod['key'])
    raw = get(BASE + url)
    if not raw:
        raise SystemExit(f'fetch-modules: cannot read {url}')
    items = json.loads(raw)
    if not isinstance(items, list):
        raise SystemExit(f'fetch-modules: unexpected {mod["key"]} payload')
    out = []
    for it in items:
        views = {}
        for a in it['angles']:
            zh = a.get('zh')
            if zh not in VIEW_KEY:
                raise SystemExit(f'fetch-modules: unknown view {zh!r} in {it["id"]}')
            key = VIEW_KEY[zh]
            if key in views:
                raise SystemExit(f'fetch-modules: duplicate view {key} in {it["id"]}')
            image_path = a.get('t') or a.get('i')
            src = os.path.basename(urlsplit(image_path).path) if isinstance(image_path, str) else None
            if not src:
                raise SystemExit(f'fetch-modules: missing source filename in {it["id"]}')
            views[key] = src
        extra = {k: it[k] for k in mod['extra'] if k in it}
        out.append({
            'id': it['id'], 'cat': it['cat'], 'ti': it['ti'], 'zh': it['zh'],
            'en': it['en'], 'ja': it['ja'], 'line': it['line'], 'lineEn': it['lineEn'],
            'views': views, 'extra': extra,
        })
    if len(out) != EXPECT[mod['sub']]:
        raise SystemExit(f'fetch-modules: {mod["sub"]} expected {EXPECT[mod["sub"]]} items, got {len(out)}')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    src_dir = os.path.join(RAW, mod['sub'], 'source')
    os.makedirs(src_dir, exist_ok=True)
    with open(os.path.join(src_dir, mod['key'] + '.json'), 'wb') as f:
        f.write(raw)
    print(f'fetch-modules: {mod["sub"]} data {len(out)} items <- {url}')
    return out


def paths(mod: dict, item: dict) -> list[tuple[list[str], str]]:
    """返回 (候选 URL 列表, 目标文件) 列表。"""
    pre = mod['pre']
    out = []
    for view, src in item['views'].items():
        base = f'{item["id"]}_{view}.webp'
        # 缩略图优先走独立图片站，回退到主站原图。
        out.append(([
            f'{IMG}/{pre}/t/{base}',
            f'{BASE}/{pre}/t/{base}',
            f'{BASE}/{pre}/i/{base}',
        ], os.path.join(RAW, mod['sub'], 'files', 'w300', src)))
        out.append(([
            f'{BASE}/{pre}/i/{base}',
            f'{IMG}/{pre}/t/{base}',
        ], os.path.join(RAW, mod['sub'], 'files', 'w900', src)))
    return out


def main() -> None:
    args = sys.argv[1:]
    refresh = '--refresh' in args
    if '--raw' in args:
        global RAW
        RAW = os.path.abspath(args[args.index('--raw') + 1])
    print(f'fetch-modules: raw={RAW}')
    jobs = []
    for mod in MODULES:
        items = load_data(mod, refresh)
        for item in items:
            jobs.extend(paths(mod, item))
    print(f'fetch-modules: {len(jobs)} files to check ({WORKERS} workers)')
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results = list(pool.map(lambda j: download(*j), jobs))
    print(f'fetch-modules: downloaded={stats["ok"]} cached={stats["skip"]} failed={stats["fail"]}')
    if not all(results):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
