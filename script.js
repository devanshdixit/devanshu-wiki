// Demo: rebuild a signal from a few samples, then score the rebuild two ways.
// A curve that passes through its samples is perfect on them by construction,
// so only the error on points it never saw says how good the rebuild is.
(() => {
  const canvas = document.getElementById('demo-canvas');
  const slider = document.getElementById('demo-n');
  if (!canvas || !slider || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const nOut = document.getElementById('demo-n-out');
  const givenOut = document.getElementById('demo-given');
  const unseenOut = document.getElementById('demo-unseen');

  const M = 481; // points in the true signal
  const truth = (t) =>
    0.55 * Math.sin(2 * Math.PI * (1.6 * t + 0.1)) +
    0.28 * Math.sin(2 * Math.PI * (4.3 * t + 0.6)) +
    0.12 * Math.sin(2 * Math.PI * 9.1 * t);
  const dense = Array.from({ length: M }, (_, k) => truth(k / (M - 1)));

  // Keep n evenly spaced samples, rebuild the rest with cubic (Catmull-Rom) interpolation.
  function rebuild(n) {
    const idx = Array.from({ length: n }, (_, j) => Math.round((j * (M - 1)) / (n - 1)));
    const vals = idx.map((k) => dense[k]);
    const recon = new Array(M);
    for (let s = 0; s < n - 1; s++) {
      const a = idx[s];
      const b = idx[s + 1];
      const p0 = vals[Math.max(s - 1, 0)];
      const p1 = vals[s];
      const p2 = vals[s + 1];
      const p3 = vals[Math.min(s + 2, n - 1)];
      const m1 = (p2 - p0) / 2;
      const m2 = (p3 - p1) / 2;
      for (let k = a; k <= b; k++) {
        const u = b === a ? 0 : (k - a) / (b - a);
        const u2 = u * u;
        const u3 = u2 * u;
        recon[k] =
          (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 +
          (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
      }
    }
    return { idx, vals, recon };
  }

  function rmse(points, recon) {
    if (!points.length) return 0;
    let sum = 0;
    for (const k of points) {
      const d = recon[k] - dense[k];
      sum += d * d;
    }
    return Math.sqrt(sum / points.length);
  }

  let dpr = 1;

  function size() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }

  function draw(model) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--link').trim();
    const bg = css.getPropertyValue('--bg').trim();
    const faint = css.getPropertyValue('--muted').trim();
    const rule = css.getPropertyValue('--rule').trim();

    const pad = 12;
    const range = 1.3;
    const px = (k) => pad + (k / (M - 1)) * (w - 2 * pad);
    const py = (v) => h / 2 - (v * (h / 2 - pad)) / range;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // zero line
    ctx.strokeStyle = rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, h / 2);
    ctx.lineTo(w - pad, h / 2);
    ctx.stroke();

    // the gap between the rebuilt curve and the truth
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    for (let k = 0; k < M; k++) ctx.lineTo(px(k), py(model.recon[k]));
    for (let k = M - 1; k >= 0; k--) ctx.lineTo(px(k), py(dense[k]));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // true signal
    ctx.strokeStyle = faint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    dense.forEach((v, k) => (k ? ctx.lineTo(px(k), py(v)) : ctx.moveTo(px(k), py(v))));
    ctx.stroke();

    // rebuilt curve
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    model.recon.forEach((v, k) => (k ? ctx.lineTo(px(k), py(v)) : ctx.moveTo(px(k), py(v))));
    ctx.stroke();

    // the samples it was given
    const r = model.idx.length > 50 ? 3 : 4.5;
    ctx.fillStyle = bg;
    ctx.lineWidth = 2;
    model.idx.forEach((k, j) => {
      ctx.beginPath();
      ctx.arc(px(k), py(model.vals[j]), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function update() {
    const n = Number(slider.value);
    const model = rebuild(n);
    const given = new Set(model.idx);
    const unseenPoints = [];
    for (let k = 0; k < M; k++) if (!given.has(k)) unseenPoints.push(k);

    nOut.textContent = String(n);
    givenOut.textContent = rmse(model.idx, model.recon).toFixed(3);
    unseenOut.textContent = rmse(unseenPoints, model.recon).toFixed(3);
    draw(model);
  }

  size();
  update();
  slider.addEventListener('input', update);

  let timer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      size();
      update();
    }, 100);
  });
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', update);
})();
