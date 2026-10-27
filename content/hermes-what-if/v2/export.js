// Exports slides.html (one long strip) as one page per slide:
//   export/carousel.pdf      10 pages, 1080x1350, real text (sharp at any zoom)
//   export/instagram/NN.jpg  2160x2700 stills for Instagram (via finish.py)
// Run: node export.js
const {chromium} = require('playwright');
const path = require('path');
const fs = require('fs');
const {execFileSync} = require('child_process');

const N = 10, W = 1080, H = 1350;
const out = path.join(__dirname, 'export');

(async () => {
  fs.mkdirSync(path.join(out, '.png'), {recursive: true});
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: W, height: H}, deviceScaleFactor: 2});
  await page.goto('file://' + path.join(__dirname, 'slides.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  // cut the strip into pages; each page keeps only what reaches into it. No margin for shadows: an element
  // parked just past a page edge made Chrome shrink every page of a multi-page print to fit it
  await page.evaluate(({N, W}) => {
    const pano = document.getElementById('pano');
    const x0 = pano.getBoundingClientRect().left;
    const kids = [...pano.children].map(k => {
      const r = k.getBoundingClientRect();
      return {k, from: r.left - x0, to: r.right - x0};
    });
    const pages = document.createElement('div');
    for (let i = 0; i < N; i++) {
      const pg = document.createElement('section');
      pg.className = 'page';
      const strip = pano.cloneNode(false);
      strip.removeAttribute('id');
      strip.style.left = -i * W + 'px';
      kids.filter(c => c.to > i * W && c.from < (i + 1) * W).forEach(c => strip.appendChild(c.k.cloneNode(true)));
      pg.appendChild(strip);
      pages.appendChild(pg);
    }
    pano.replaceWith(pages);
    const st = document.createElement('style');
    st.textContent = `@page{size:${W}px 1350px;margin:0}
      html,body{margin:0;background:none}
      .page{position:relative;width:${W}px;height:1350px;overflow:hidden}
      .page+.page{break-before:page}
      .page .pano{position:absolute;top:0}`;
    document.head.appendChild(st);
  }, {N, W});
  await page.waitForTimeout(300);

  const pages = await page.$$('section.page');
  for (let i = 0; i < pages.length; i++) {
    await pages[i].screenshot({path: path.join(out, '.png', String(i + 1).padStart(2, '0') + '.png')});
  }
  await page.pdf({path: path.join(out, 'carousel.pdf'), width: W + 'px', height: H + 'px',
    printBackground: true, preferCSSPageSize: true, margin: {top: 0, right: 0, bottom: 0, left: 0}});
  await browser.close();
  execFileSync('python3', [path.join(__dirname, 'finish.py'), out], {stdio: 'inherit'});
  console.log('exported', pages.length, 'pages');
})();
