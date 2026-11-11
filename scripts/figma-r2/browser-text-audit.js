/* Paste into the Chrome DevTools Console while viewing the local Public homepage.
 * Read-only DOM audit; makes no requests, mutates no page content.
 * Run after the page has loaded: text/font and clip results are independent of Typecheck.
 */
void (async () => {
  await document.fonts.ready;
  const keys = [
    'node-1:102', 'node-1:479', 'node-1:484',
    'node-1:155', 'node-1:401', 'node-1:405', 'node-18:59',
    'node-1:103', 'node-1:104',
  ];
  const fontFaces = Array.from(document.fonts).filter(f => /Pretendard/i.test(f.family));
  const fontLoaded = fontFaces.some(f => f.status === 'loaded');
  const brand = document.querySelector('.smd-site-header__brand-label');
  const brandStyle = brand ? getComputedStyle(brand) : null;
  const brandRect = brand?.getBoundingClientRect() ?? null;
  const brandRange = document.createRange();
  if (brand) brandRange.selectNodeContents(brand);
  const brandGlyph = brand ? brandRange.getBoundingClientRect() : null;
  const tolerance = 1.5;
  const inside = (rect, region) => (
    rect.left >= region.left - tolerance &&
    rect.right <= region.right + tolerance &&
    rect.top >= region.top - tolerance &&
    rect.bottom <= region.bottom + tolerance
  );
  const brandPass = Boolean(brand && brand.textContent === 'SMD아카데미' &&
    brandStyle?.fontWeight === '700' && brandRect && brandGlyph &&
    inside(brandGlyph, brandRect));
  const semantic = document.querySelector('.smd-home--semantic-reflow');
  const semanticVisible = Boolean(semantic && getComputedStyle(semantic).display !== 'none');
  const rows = keys.map(key => {
    if (innerWidth <= 1099) return {key, status:'NOT_SCENE_VIEW', ink:'', font:''};
    const foreign = document.querySelector(`foreignObject[data-figma-text-instance="${key}"]`);
    if (!foreign) return {key, status: innerWidth > 1099 ? 'MISSING' : 'NOT_SCENE_VIEW', ink: '', font: ''};
    const box = foreign.getBoundingClientRect();
    const spans = foreign.querySelectorAll('.smd-figma-native-text__runs span');
    const glyphs = Array.from(spans).flatMap(span => {
      const range = document.createRange();
      range.selectNodeContents(span);
      return Array.from(range.getClientRects());
    });
    const allInside = glyphs.length > 0 && glyphs.every(g => inside(g, box));
    return {
      key,
      status: allInside ? 'PASS' : 'GLYPH_OUTSIDE_PAINT_WINDOW',
      source: foreign.getAttribute('data-source-rect'),
      paint: foreign.getAttribute('data-paint-window'),
      ink: foreign.getAttribute('data-ink-gate'),
      font: foreign.getAttribute('data-font-gate'),
      computedFont: spans.length ? getComputedStyle(spans[0]).fontFamily : 'NONE',
    };
  });
  const xOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  const data = {
    width: innerWidth,
    url: location.href,
    fontLoaded,
    fontFaces: fontFaces.map(f => ({family:f.family, status:f.status, weight:f.weight})),
    brand: {text:brand?.textContent, weight:brandStyle?.fontWeight, family:brandStyle?.fontFamily, pass:brandPass},
    semanticVisible, xOverflow,
    rows,
    pass: Boolean(fontLoaded && brandPass && !xOverflow && (innerWidth > 1099 ? rows.every(r => r.status === 'PASS') : semanticVisible)),
  };
  console.table(rows);
  console.log('SMD_HOME_R2_TEXT_HEADER_BROWSER_AUDIT', data);
  return data;
})();
