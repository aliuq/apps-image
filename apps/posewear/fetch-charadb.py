#!/usr/bin/env python3
"""补齐 CharaDB 元数据，图片保持外链。

上游 build.py 要求 POSEWEAR_RAW/charadb/hair.json 与 charadb/outfits.json；
官方 prep-modules.py 从作者本地档案生成这两份数据。本脚本改为读取上游部署站已
发布的 hair.json / anime.json，提取 122 条发型与 440 套 CharaDB 动画服装，写入
build.py 期望的字段结构。

图片地址保持 https://charadb-2fi.pages.dev/...，不下载、不复制任何图片。上游
要求 CharaDB 图片只能热链、禁止再分发；build.py 会把该源站写入 CSP img-src。
"""

from __future__ import annotations

import http.client
import json
import os
import re
import ssl
import sys
import time
from urllib.parse import urlsplit

BASE = os.environ.get('POSEWEAR_MODULES_BASE', 'https://posewear.pages.dev')
RAW = os.path.abspath(os.environ.get('POSEWEAR_RAW', 'assets-raw'))
EXPECT_HAIR = 122
EXPECT_OUTFITS = 440
EXPECT_ANIME = 1760

local = {}


def _conn(host: str):
    conn = local.get(host)
    if conn is None:
        conn = http.client.HTTPSConnection(host, timeout=60, context=ssl.create_default_context())
        local[host] = conn
    return conn


def get(url: str) -> bytes | None:
    u = urlsplit(url)
    for attempt in range(4):
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
            conn = local.pop(u.netloc, None)
            if conn is not None:
                try:
                    conn.close()
                except Exception:
                    pass
        time.sleep(1 + attempt * 2)
    return None


def discover(key: str) -> str:
    """从部署站首页 + app.js 找到当前数据集哈希地址。"""
    index = get(BASE + '/')
    if not index:
        raise SystemExit('fetch-charadb: cannot read ' + BASE + '/')
    app = re.search(rb'/assets/app\.[a-f0-9]+\.js', index)
    if not app:
        raise SystemExit('fetch-charadb: app.js not found in index')
    js = get(BASE + app.group(0).decode())
    if not js:
        raise SystemExit('fetch-charadb: cannot read app.js')
    m = re.search(rb"'/assets/" + key.encode() + rb"\.[a-f0-9]+\.json'", js)
    if not m:
        raise SystemExit(f'fetch-charadb: dataset {key} not found in app.js')
    return m.group(0).decode().strip("'")


def load(key: str, expect: int) -> list:
    src = os.path.join(RAW, 'charadb', 'source', key + '.json')
    if os.path.isfile(src):
        data = json.load(open(src, encoding='utf-8'))
    else:
        url = discover(key)
        blob = get(BASE + url)
        if not blob:
            raise SystemExit(f'fetch-charadb: cannot read {url}')
        data = json.loads(blob)
        os.makedirs(os.path.dirname(src), exist_ok=True)
        open(src, 'wb').write(blob)
    if not isinstance(data, list):
        raise SystemExit(f'fetch-charadb: unexpected {key} payload')
    if len(data) != expect:
        raise SystemExit(f'fetch-charadb: {key} expected {expect} items, got {len(data)}')
    return data


def parse_tags(name: str, zh: str) -> list[str]:
    """由最终中文描述反推 build.py 需要的 tagsZh 列表。"""
    if not zh.endswith('。'):
        raise SystemExit(f'fetch-charadb: unexpected zh {zh!r}')
    body = zh[:-1]
    head, sep, rest = body.partition('，')
    if not sep or head != name:
        raise SystemExit(f'fetch-charadb: zh/name mismatch: {name!r} / {zh!r}')
    return [name] + rest.split('、')


def require_hotlink(url: str, label: str) -> str:
    if not isinstance(url, str) or not url.startswith('https://'):
        raise SystemExit(f'fetch-charadb: {label} is not a hotlink URL: {url!r}')
    return url


def main() -> None:
    args = sys.argv[1:]
    if '--raw' in args:
        global RAW
        RAW = os.path.abspath(args[args.index('--raw') + 1])
    root = os.path.join(RAW, 'charadb')
    os.makedirs(root, exist_ok=True)

    anime = load('anime', EXPECT_ANIME)
    hair = load('hair', EXPECT_HAIR)
    outfits = [x for x in anime if str(x.get('id', '')).startswith('charadb-O')]
    if len(outfits) != EXPECT_OUTFITS:
        raise SystemExit(f'fetch-charadb: expected {EXPECT_OUTFITS} CharaDB outfits, got {len(outfits)}')

    # build.py 期望的源头字段：name/tagsZh/t/m/i/sens；t/m/i 保持原站 URL。
    out_src = []
    for d in outfits:
        item = {
            'id': d['id'], 'cat': d['cat'], 'catEn': d['catEn'], 'kw': d['kw'],
            'name': d['ti'], 'tagsZh': parse_tags(d['ti'], d['zh']),
            'sens': bool(d.get('a')),
        }
        for key in ('t', 'm', 'i'):
            item[key] = require_hotlink(d[key], f'{d["id"]}.{key}')
        out_src.append(item)

    # build.py 直接序列化 hair.json；保持角度与图片 URL 原样。
    for d in hair:
        if 'angles' in d:
            for a in d['angles']:
                for key in ('t', 'i'):
                    if a.get(key):
                        require_hotlink(a[key], f'{d.get("id")}.{key}')
        else:
            for key in ('t', 'm', 'i'):
                if d.get(key):
                    require_hotlink(d[key], f'{d.get("id")}.{key}')

    json.dump(out_src, open(os.path.join(root, 'outfits.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    json.dump(hair, open(os.path.join(root, 'hair.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print(f'fetch-charadb: outfits={len(out_src)} hair={len(hair)} (images hotlinked)')


if __name__ == '__main__':
    main()
