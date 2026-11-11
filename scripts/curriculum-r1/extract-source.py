"""Regenerate the pinned curriculum source; requires psd-tools, Pillow, PyMuPDF."""
from pathlib import Path
from io import BytesIO
import argparse
import hashlib
import json
import math
from psd_tools import PSDImage
from PIL import Image
import fitz

EXPECTED = '42da24276ea7c449f886164c439854f84bfadff679f896fc55abad4cc531c012'
SECTIONS = [
    ('hero', 132, 945), ('facts', 945, 1180),
    ('introduction', 1180, 1714), ('daily-flow', 1714, 2385),
    ('practical-training', 2385, 3697), ('six-week-program', 3697, 4967),
    ('course-information', 4967, 5719), ('consultation-cta', 5719, 6231),
]
WEIGHTS = {'Regular': 400, 'Medium': 500, 'SemiBold': 600, 'Bold': 700, 'ExtraBold': 800}
COLOR_REFS = {'#172C57': 'var(--smd-brand-navy)', '#D95E22': 'var(--smd-action-orange)',
              '#D95E23': 'var(--smd-action-orange)', '#F2F6FF': 'var(--smd-surface-panel)',
              '#F2F2F2': 'var(--smd-surface-alternate)', '#2E2E2E': 'var(--smd-footer-background)'}
digest = lambda b: hashlib.sha256(b).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


def section_id(top):
    matches = [sid for sid, start, end in SECTIONS if start <= top < end]
    if len(matches) != 1:
        raise ValueError('CURRICULUM_SECTION_UNRESOLVED:' + str(top))
    return matches[0]


def rgb(d):
    return '#' + ''.join(f'{round(float(d[k])):02X}' for k in [b'Rd  ', b'Grn ', b'Bl  '])


def frame(layer):
    origins = layer.origination
    if len(origins) != 1:
        raise ValueError('CURRICULUM_SHAPE_ORIGIN_UNRESOLVED')
    return [float(v) for v in origins[0].bbox]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True)
    parser.add_argument('--root', default=str(Path(__file__).resolve().parents[2]))
    args = parser.parse_args()
    source, root = Path(args.source), Path(args.root)
    if digest(source.read_bytes()) != EXPECTED:
        raise ValueError('CURRICULUM_PSD_SOURCE_MISMATCH')
    psd = PSDImage.open(source)
    if psd.size != (1920, 6958) or psd.depth != 8:
        raise ValueError('CURRICULUM_PSD_GEOMETRY_MISMATCH')
    layers = list(psd.descendants())
    if len(layers) != 145 or any(l.is_group() for l in layers):
        raise ValueError('CURRICULUM_PSD_STRUCTURE_MISMATCH')
    by_id = {l.layer_id: l for l in layers}
    texts, shapes, photos = {}, {}, {}
    sections = [{'id': sid, 'top': start, 'height': end-start,
                 'mappingStatus': 'APPROVED_MAPPING', 'sourceGrouping': 'CANDIDATE_VIRTUAL_TREE',
                 'textLayerIds': []} for sid, start, end in SECTIONS]
    inventory = []
    for order, layer in enumerate(layers):
        inventory.append({'layerId': layer.layer_id, 'order': order, 'parentId': None,
                          'kind': layer.kind, 'name': layer.name, 'bbox': list(layer.bbox),
                          'visible': layer.visible, 'opacity': layer.opacity, 'clipping': layer.clipping})
        if layer.kind != 'type' or not 132 <= layer.top < 6231:
            continue
        sid, raw = section_id(layer.top), layer.text
        # TypeSetting resolves Photoshop's inherited character styles. Do not guess missing paint.
        runs, offset = [], 0
        scale = math.hypot(layer.transform[2], layer.transform[3])
        for run in layer.typesetting.runs:
            s, text = run.style, run.text
            if not text:
                continue
            start, end = offset, offset + len(text.encode('utf-16-le')) // 2
            rgba = list(s.fill_color)
            color = '#' + ''.join(f'{round(v*255):02X}' for v in rgba[1:])
            suffix = s.font_name.split('-')[-1]
            if suffix not in WEIGHTS or not s.font_name.startswith('Pretendard-'):
                raise ValueError('CURRICULUM_FONT_UNSUPPORTED:' + s.font_name)
            runs.append({'startUtf16': start, 'endUtf16': end, 'text': text.replace('\r', '\n'),
                         'fontName': s.font_name, 'fontWeight': WEIGHTS[suffix],
                         'sourceColor': color, 'cssColor': COLOR_REFS.get(color, color),
                         'sourceAlpha': rgba[0], 'opacity': rgba[0] * layer.opacity / 255})
            offset = end
        if ''.join(r['text'] for r in runs) != raw.replace('\r', '\n'):
            raise ValueError('CURRICULUM_TEXT_RUN_COVERAGE:' + str(layer.layer_id))
        first = layer.typesetting.runs[0].style
        leading = first.font_size * layer.typesetting.default_paragraph_style.auto_leading if first.auto_leading else first.leading
        if leading <= 0:
            raise ValueError('CURRICULUM_LEADING_UNRESOLVED:' + str(layer.layer_id))
        texts[str(layer.layer_id)] = {
            'sourceLayerId': layer.layer_id, 'sourceKey': EXPECTED + ':' + str(layer.layer_id),
            'sectionId': sid, 'rawText': raw, 'displayText': raw.replace('\r', '\n'),
            'sourceTextDigest': digest(raw.encode()), 'bbox': list(layer.bbox),
            'baselineOrigin': list(layer.transform[4:6]), 'fontSize': first.font_size*scale,
            'lineHeight': leading*scale, 'leadingMode': 'paragraph-auto' if first.auto_leading else 'explicit', 'trackingEm': first.tracking/1000,
            'runs': runs}
        next(s for s in sections if s['id'] == sid)['textLayerIds'].append(layer.layer_id)

    # Original smart-object bytes and explicit Photoshop clip relationships.
    specs = [('curriculum.hero.photo', 563, 332, 'hero'),
             ('curriculum.practice.foundation', 568, 63, 'practical-training'),
             ('curriculum.practice.finishing', 569, 377, 'practical-training'),
             ('curriculum.practice.field', 570, 381, 'practical-training'),
             ('curriculum.practice.next-step', 571, 385, 'practical-training')]
    public = root/'public/curriculum'
    public.mkdir(parents=True, exist_ok=True)
    for slot, lid, clip, sid in specs:
        l, c = by_id[lid], by_id[clip]
        so, f = l.smart_object, frame(c)
        data = so.data
        image = Image.open(BytesIO(data))
        w, h = image.size
        x0, y0, x1, y1, x2, y2, x3, y3 = so.transform_box
        if abs(x1+x3-x0-x2) > .001 or abs(y1+y3-y0-y2) > .001:
            raise ValueError('CURRICULUM_NON_AFFINE_PHOTO')
        fw, fh = f[2]-f[0], f[3]-f[1]
        matrix = [(x1-x0)/w/fw, (y1-y0)/w/fh, (x3-x0)/h/fw, (y3-y0)/h/fh,
                  (x0-f[0])/fw, (y0-f[1])/fh]
        radii = getattr(c.origination[0], 'radii', None)
        radius = float(radii[b'topLeft']) if radii else 0
        (public/so.filename).write_bytes(data)
        photos[slot] = {'slotId': slot, 'sourceLayerId': lid, 'clipLayerId': clip,
                        'sectionId': sid, 'fileName': so.filename, 'sha256': digest(data),
                        'byteLength': len(data), 'mimeType': 'image/png', 'sourceWidth': w,
                        'sourceHeight': h, 'frame': f, 'sourceTransform': list(so.transform_box),
                        'sourceToFrame': matrix, 'radius': radius, 'alt': l.name}

    for layer in layers:
        if layer.kind != 'shape' or layer.layer_id in [5, 12, 139] or not 132 <= layer.top < 6231:
            continue
        lid, sid = layer.layer_id, section_id(frame(layer)[1])
        stroke = layer.tagged_blocks.get_data(b'vstk')
        paint = layer.tagged_blocks.get_data(b'vscg')
        fill_color = rgb(paint[b'Clr '])
        stroke_color = rgb(stroke[b'strokeStyleContent'][b'Clr '])
        origin = layer.origination[0]
        line = getattr(origin, 'origin_type', None) == 4
        d = {'sourceLayerId': lid, 'sectionId': sid, 'frame': frame(layer),
             'kind': 'line' if line else 'rect', 'fillEnabled': bool(stroke[b'fillEnabled']),
             'sourceFill': fill_color, 'fill': COLOR_REFS.get(fill_color, fill_color),
             'strokeEnabled': bool(stroke[b'strokeEnabled']), 'sourceStroke': stroke_color,
             'stroke': COLOR_REFS.get(stroke_color, stroke_color),
             'strokeWidth': float(stroke[b'strokeStyleLineWidth']), 'opacity': layer.opacity/255,
             'radii': [float(origin.radii[k]) for k in [b'topLeft', b'topRight', b'bottomRight', b'bottomLeft']] if getattr(origin, 'radii', None) else [0,0,0,0],
             'start': [float(origin.line_start[b'Hrzn']), float(origin.line_start[b'Vrtc'])] if line else [0,0],
             'end': [float(origin.line_end[b'Hrzn']), float(origin.line_end[b'Vrtc'])] if line else [0,0],
             'lineWeight': float(origin.line_weight) if line else 0}
        shapes[str(lid)] = d

    arrow_layer = by_id[361]
    arrow_bytes = arrow_layer.smart_object.data
    doc = fitz.open(stream=arrow_bytes, filetype='pdf')
    svg = doc[0].get_svg_image(text_as_path=True).encode()
    arrow_name = 'curriculum-class-flow.svg'
    (public/arrow_name).write_bytes(svg)
    arrow = {'sourceLayerId': 361, 'sectionId': 'daily-flow', 'fileName': arrow_name,
             'sourceFileName': arrow_layer.smart_object.filename, 'sourceSha256': digest(arrow_bytes),
             'sha256': digest(svg), 'byteLength': len(svg), 'frame': list(arrow_layer.bbox),
             'derivation': 'embedded PDF page 0 to SVG paths via PyMuPDF'}
    manifest = {
        'schema': 'SMD_CURRICULUM_BUILD_SOURCE_V1', 'sourceAuthority': 'PSD_BUILD_SOURCE_V1',
        'pageId': 'curriculum', 'psdFileName': source.name, 'psdSha256': EXPECTED,
        'sourceWidth': 1920, 'sourceHeight': 6958, 'sourceBodyOriginY': 132,
        'sourceBodyEndY': 6231, 'sourceLayerCount': 145, 'sourceTextCount': 103,
        'bodyTextCount': 95, 'photoCount': 5, 'sections': sections,
        'webFontMetrics': {'fontRelease': 'pretendard@1.3.9', 'unitsPerEm': 2048,
                           'ascent': 1950, 'descent': 494, 'lineGap': 0},
        'displayOverrides': {'19': {'rawText': '20년 경력', 'text': '6주 과정',
                                    'reason': 'Approved duration label/value correction; original PSD retained'}},
        'semanticChanges': ['Education-period display: 20년 경력 → 6주 과정',
                            'AM/PM display #D95E23 → shared --smd-action-orange (#D95E22)',
                            'Existing CMS slot afterTeach follows practical training; afterLearningPath follows six-week program'],
        'unresolved': ['Week 02–06 detailed content is not provided',
                       'Week 01 right-hand media panel intentionally unassigned',
                       'Legacy seed/fixture 48 hours, 09–18, 5 seats differs from PSD 42 hours, 09–17, 6 seats'],
        'boundaryMapping': {'header': 'existing SiteHeader geometry; PSD Header excluded',
                            'footer': 'existing SiteFooter; PSD FOOTER placeholder excluded',
                            'ctaFooterOverlap': 'PSD CTA ends 6237; later Footer starts 6231; body ends at visible boundary 6231'},
    }
    assets = {'photos': photos, 'arrow': arrow}
    frozen = {'manifest': manifest, 'text': texts, 'shapes': shapes, 'assets': assets,
              'sourceInventory': inventory}
    content_digest = digest(json.dumps(frozen, ensure_ascii=False, separators=(',', ':')).encode())
    manifest['sourceManifestDigest'] = content_digest
    frozen['manifest'] = manifest
    for filename, name, data in [
        ('curriculum-r1-manifest.ts', 'curriculumR1Source', manifest),
        ('curriculum-r1-copy.generated.ts', 'curriculumSourceText', texts),
        ('curriculum-r1-shapes.generated.ts', 'curriculumSourceShapes', shapes),
        ('curriculum-r1-assets.generated.ts', 'curriculumSourceAssets', assets)]:
        path = root/'app/data'/filename
        path.write_text('/** Pinned PSD source witness. Shared UI tokens own mapped display paint. */\nexport const '+name+' = '+json.dumps(data, ensure_ascii=False, indent=2)+' as const;\n', encoding='utf8')
    write_json(root/'docs/migration/smd-curriculum-r1/source-manifest.json', frozen)
    print(json.dumps({'text': len(texts), 'photos': len(photos), 'shapes': len(shapes),
                      'sourceManifestDigest': content_digest}))


if __name__ == '__main__':
    main()
