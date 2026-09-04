/**
 * holo-table — the command table, as an actual 3D model.
 *
 * ⚠️ WHY THIS IS A CANVAS AND NOT CSS BOXES. This started as stacked ellipses and
 * then as CSS 3D transforms, and both read as flat no matter how they were shaded.
 * The reason is structural: CSS can only transform RECTANGLES. A lathe — a solid of
 * revolution — has curvature that changes shading continuously around its
 * circumference, and no arrangement of gradients on flat quads reproduces that. The
 * globe next to it is raw WebGL for exactly the same reason. So this is a real mesh:
 * a profile revolved 64 ways, projected through a real camera, and shaded per face.
 *
 * ⚠️ AND IT COSTS NOTHING PER FRAME. The CSS 3D version put ~35 composited layers
 * over a room that moves under them, and the compositor re-blended all of them every
 * frame: measured, it took the turn from ~65fps to ~48. This is ONE canvas, one
 * layer, drawn ONCE on mount and again only when the size or the door changes.
 * There is no animation loop in this file on purpose.
 */

const SEG = 64                     // segments around; drawn once, so spend them
const PITCH = 25 * Math.PI / 180   // how far down onto the table we are looking
const DIST = 1150                  // camera distance
const FOCAL = 1180

/* THE PROFILE — [radius, height], floor at 0, revolved about the Y axis.
   Read it bottom to top and you get the silhouette: a broad plinth, a taper, the
   ribbed body, then the rim OVERHANGING the body, which is the single line that
   makes it read as a designed table rather than a bucket. */
const PROFILE = [
  [0,   0], [250, 0], [250, 11], [238, 18], [233, 23], [230, 40],
  [198, 50], [192, 58], [192, 178], [198, 186],
  [240, 198], [244, 214], [238, 228], [228, 235],
  [156, 240], [146, 226], [54, 219], [0, 217],
]

/* Per-band material. `k` is base lightness, `b` a blue-cyan lift, `e` emissive. */
const BANDS = [
  { k: 0.055, b: 0.06, e: 0 },  // plinth underside
  { k: 0.095, b: 0.07, e: 0 },  // plinth wall
  { k: 0.150, b: 0.07, e: 0 },  // plinth chamfer
  { k: 0.070, b: 0.62, e: 0.40 },// the light strip round the foot
  { k: 0.115, b: 0.07, e: 0 },  // skirt
  { k: 0.175, b: 0.07, e: 0 },  // step
  { k: 0.085, b: 0.07, e: 0 },  // step riser
  { k: 0.130, b: 0.07, e: 0 },  // BODY
  { k: 0.200, b: 0.07, e: 0 },  // body shoulder
  { k: 0.105, b: 0.07, e: 0 },  // under the overhang, in shade
  { k: 0.255, b: 0.07, e: 0 },  // rim outer face
  { k: 0.300, b: 0.07, e: 0 },  // rim edge
  { k: 0.245, b: 0.07, e: 0 },  // rim top bevel
  { k: 0.205, b: 0.07, e: 0 },  // rim top
  { k: 0.075, b: 0.14, e: 0 },  // well lip
  { k: 0.055, b: 0.45, e: 0.20 },// well wall
  { k: 0.050, b: 0.52, e: 0.26 },// well floor
]

const rotX = (p, a) => {
  const c = Math.cos(a), s = Math.sin(a)
  return { x: p.x, y: p.y * c + p.z * s, z: -p.y * s + p.z * c }
}

function makeProjector(cx, cy, scale) {
  return (p) => {
    const v = rotX(p, -PITCH)
    const d = DIST - v.z
    return { x: cx + (FOCAL * v.x / d) * scale, y: cy - (FOCAL * v.y / d) * scale, d }
  }
}

function shade(n, m) {
  // one key light high and to the left, one cool fill from the room's cove
  const L = [-0.42, 0.86, 0.30]
  const ln = Math.hypot(...L)
  const diff = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ln)
  const fill = Math.max(0, n[2]) * 0.22
  let v = m.k * (0.34 + 0.78 * diff) + fill * 0.5 + m.e * 0.55
  v = Math.max(0, Math.min(1, v))
  const r = Math.round(255 * v * (1 - m.b * 0.88))
  const g = Math.round(255 * v * (1 - m.b * 0.10))
  const b = Math.round(255 * Math.min(1, v * (1 + m.b * 1.05)))
  return `rgb(${r},${g},${b})`
}

/** Lay a run of text along the drum, one glyph at a time.
 *  ⚠️ THE FONT IS SIZED IN MODEL UNITS, not pixels. Each glyph gets the local
 *  surface frame at its own angle — tangent for u, world-down for v — so
 *  perspective shrinks the far end of the line by itself. Sizing in screen pixels
 *  and stepping along a straight baseline is what made the label look pasted on. */
function curvedText(ctx, project, text, opts) {
  const { Rt, aCenter, y, fs, fill, align = 'center', uStart = 0 } = opts
  ctx.font = `${fs}px ui-monospace, Menlo, monospace`
  const chars = [...text]
  const w = chars.map((c) => ctx.measureText(c).width)
  const total = w.reduce((a, b) => a + b, 0)
  let u = align === 'center' ? -total / 2 : uStart
  for (let i = 0; i < chars.length; i++) {
    const uc = u + w[i] / 2
    const a = aCenter - uc / Rt              // +u runs to screen right, angle falls
    const p = { x: Rt * Math.cos(a), y, z: Rt * Math.sin(a) }
    const P = project(p)
    const Pt = project({ x: Rt * Math.cos(a - 1 / Rt), y, z: Rt * Math.sin(a - 1 / Rt) })
    const Pv = project({ x: p.x, y: y - 1, z: p.z })
    ctx.save()
    ctx.setTransform(Pt.x - P.x, Pt.y - P.y, Pv.x - P.x, Pv.y - P.y, P.x, P.y)
    ctx.fillStyle = fill
    ctx.font = `${fs}px ui-monospace, Menlo, monospace`
    ctx.fillText(chars[i], -w[i] / 2, 0)
    ctx.restore()
    u += w[i]
  }
  return total
}

export function mountTable(host, opts = {}) {
  const canvas = document.createElement('canvas')
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  host.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvas.remove(); return null }

  let facing = ''
  let screenQuad = null      // projected corners of the ORION screen, for the DOM pane
  let lastDpr = 1
  let facingQuad = null
  let orionPocket = null
  let facingPocket = null

  function build() {
    const faces = []
    for (let i = 0; i < PROFILE.length - 1; i++) {
      const [r0, y0] = PROFILE[i], [r1, y1] = PROFILE[i + 1]
      const m = BANDS[Math.min(i, BANDS.length - 1)]
      for (let s = 0; s < SEG; s++) {
        const a0 = (s / SEG) * Math.PI * 2, a1 = ((s + 1) / SEG) * Math.PI * 2
        const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1)
        const q = [
          { x: r0 * c0, y: y0, z: r0 * s0 }, { x: r0 * c1, y: y0, z: r0 * s1 },
          { x: r1 * c1, y: y1, z: r1 * s1 }, { x: r1 * c0, y: y1, z: r1 * s0 },
        ]
        // outward normal of a lathe band: radial component from the profile slope
        const dr = r1 - r0, dy = y1 - y0
        const ln = Math.hypot(dr, dy) || 1
        const nr = dy / ln, ny = -dr / ln
        const am = (a0 + a1) / 2
        const n = [nr * Math.cos(am), ny, nr * Math.sin(am)]
        // ribs on the body band, a fine seam everywhere else
        let fill = shade(n, m)
        if (i === 7 && s % 2 === 0) fill = shade(n, { ...m, k: m.k * 0.62 })
        if ((i === 10 || i === 13) && s % 4 === 0) fill = shade(n, { ...m, k: m.k * 0.70 })
        faces.push({ q, fill })
      }
    }
    return faces
  }

  /** ⚠️ A POCKET MILLED INTO THE DRUM, not a panel stuck on the front of it.
   *  A screen used to be one flat quad tangent to the cylinder. A flat plane
   *  against a curved surface intersects it, so the corners punched out through
   *  the drum and the whole thing read as hovering in front rather than set into
   *  it. This walks the OPENING round the cylinder's own curve, drops a flat face
   *  in at a smaller radius, and connects the two with four walls — so there is a
   *  real lip, a real depth, and a shadow under the top edge.
   *  Returns the pieces in draw order: face first, then the walls over it. */
  function pocketAt(angDeg, halfAngDeg, y0, y1, lip, flatGlass) {
    const N = 8, R = 192
    const a0 = angDeg * Math.PI / 180, ha = halfAngDeg * Math.PI / 180
    const nx = Math.cos(a0), nz = Math.sin(a0)      // outward
    const tx = Math.sin(a0), tz = -Math.cos(a0)     // along the surface, screen-right
    // ⚠️ TWO KINDS OF GLASS, ON PURPOSE. Curved glass (facing, the kiosks) needs
    // only a shallow constant `lip`, because it tracks the skin at every angle. A
    // FLAT facet is closest to the skin at its own centre and falls away toward its
    // edges, so it has to be cut past the sagitta R(1-cos) or its corners poke back
    // out through the drum — cut too shallow and that is exactly what read as "the
    // screens are overlapping the table". Only ORION is flat: it is the one facet
    // that hosts a live DOM control, and a control needs a plane, not a curve, to
    // sit on straight.
    const depth = flatGlass ? R * (1 - Math.cos(ha)) + lip : lip
    const halfW = R * Math.sin(ha)
    const dist = R - depth
    const Rt = R - depth                              // the glass's own radius
    const face = (u, y) => ({ x: nx * dist + tx * u, y, z: nz * dist + tz * u })
    // ⚠️ THE OPENING FOLLOWS THE CURVE, THE FACE IS FLAT. That split is the whole
    // trick: the hole in the drum is genuinely round, so nothing juts out, while the
    // glass inside it is a real plane — which is what lets text sit on it straight.
    // Sweep high-to-low: screen x is cos(a), so low-to-high would put corner 0 right.
    const arc = (y) => {
      const out = []
      for (let i = 0; i <= N; i++) {
        const a = a0 + ha - (2 * ha) * i / N
        out.push({ x: R * Math.cos(a), y, z: R * Math.sin(a) })
      }
      return out
    }
    // ⚠️ THE GLASS IS CURVED, NOT A FLAT FACET. A flat inset made text sit dead
    // straight across a round table and read as a sticker on it. The glass follows
    // the drum, and the label is laid out glyph by glyph along the same arc, so it
    // wraps round the console the way lettering on a real cylinder does.
    const curved = (y) => {
      const out = []
      for (let i = 0; i <= N; i++) {
        const a = a0 + ha - (2 * ha) * i / N
        out.push({ x: Rt * Math.cos(a), y, z: Rt * Math.sin(a) })
      }
      return out
    }
    const flat = (y) => {
      const out = []
      for (let i = 0; i <= N; i++) out.push(face(-halfW + (2 * halfW) * i / N, y))
      return out
    }
    const oT = arc(y1), oB = arc(y0)
    const iT = flatGlass ? flat(y1) : curved(y1)
    const iB = flatGlass ? flat(y0) : curved(y0)
    return {
      face: iT.concat(iB.slice().reverse()),
      wallTop: oT.concat(iT.slice().reverse()),
      wallBot: iB.concat(oB.slice().reverse()),
      wallL: [oT[0], iT[0], iB[0], oB[0]],
      wallR: [oT[N], oB[N], iB[N], iT[N]],
      quad: [iT[0], iT[N], iB[N], iB[0]],
      Rt, a0, ha, halfAngDeg, flatGlass,
      ang: angDeg,
    }
  }

  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
    lastDpr = dpr
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const scale = (w / dpr) / 1075 * dpr
    const project = makeProjector(w / 2, h * 0.60, scale)

    const faces = build()
    const items = faces.map((f) => {
      const p = f.q.map(project)
      return { p, fill: f.fill, d: (p[0].d + p[1].d + p[2].d + p[3].d) / 4 }
    })

    // the two screens, and the small readouts round the rest of the rim.
    // ⚠️ BACK-FACE CULLED. A pocket on the far side of the drum still projects to a
    // valid polygon, and without this it paints straight over the front of the model.
    const pockets = []
    const addPocket = (ang, halfA, y0, y1, kind, flatGlass) => {
      const a = ang * Math.PI / 180
      const n = rotX({ x: Math.cos(a), y: 0, z: Math.sin(a) }, -PITCH)
      if (n.z <= 0.12) return                     // facing away, or edge-on
      const p = pocketAt(ang, halfA, y0, y1, kind === 'kiosk' ? 9 : 15, flatGlass)
      p.kind = kind
      p.d = project({ x: 192 * Math.cos(a), y: (y0 + y1) / 2, z: 192 * Math.sin(a) }).d
      pockets.push(p)
    }
    // ⚠️ CLEAR VERTICAL GAP, AND ORION IS FLAT. These used to sit at 104-152 and
    // 158-186 -- an 6-unit gap that the live DOM prompt, sized by the browser
    // rather than by this file, could and did eat into, reading as it "overlapping
    // the FACING tab". 30 units of clearance is not free real estate on a table
    // this size, so both facets gave a little: ORION lost some height, FACING
    // moved further up toward the rim.
    addPocket(90, 32, 88, 132, 'orion', true)
    addPocket(90, 50, 162, 198, 'facing')
    for (const a of [24, 156]) addPocket(a, 11, 116, 152, 'kiosk')

    // painter's algorithm — far first
    items.sort((a, b) => b.d - a.d)
    for (const it of items) {
      ctx.beginPath()
      ctx.moveTo(it.p[0].x, it.p[0].y)
      for (let i = 1; i < 4; i++) ctx.lineTo(it.p[i].x, it.p[i].y)
      ctx.closePath()
      ctx.fillStyle = it.fill
      ctx.fill()
    }

    const poly = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath() }

    for (const pk of pockets.sort((a, b) => b.d - a.d)) {
      const P = (pts) => pts.map(project)
      const glass = P(pk.face)

      // the glass itself
      poly(glass)
      if (pk.kind === 'orion') {
        // ⚠️ THE ORION POCKET IS LEFT DARK ON PURPOSE. The live input sits in this
        // hole; painting a lit screen behind it left a drawn box the DOM pane did
        // not fill, which is what read as the prompt covering up an empty box.
        ctx.fillStyle = 'rgb(6,10,15)'
      } else {
        const g = ctx.createLinearGradient(glass[0].x, glass[0].y, glass[glass.length - 1].x, glass[glass.length - 1].y)
        g.addColorStop(0, 'rgb(26,50,70)'); g.addColorStop(1, 'rgb(8,15,23)')
        ctx.fillStyle = g
      }
      ctx.fill()

      // the walls of the recess: top in shadow, bottom catching the room light
      const wall = (pts, fill) => { poly(P(pts)); ctx.fillStyle = fill; ctx.fill() }
      wall(pk.wallTop, 'rgba(3,5,8,0.96)')
      wall(pk.wallBot, 'rgba(126,150,174,0.62)')
      wall(pk.wallL, 'rgba(34,43,54,0.88)')
      wall(pk.wallR, 'rgba(18,24,31,0.92)')

      poly(glass)
      ctx.strokeStyle = 'rgba(130,205,255,0.34)'; ctx.lineWidth = 1.3 * dpr; ctx.stroke()

      if (pk.kind === 'kiosk') {
        ctx.save(); poly(glass); ctx.clip()
        ctx.strokeStyle = 'rgba(130,205,255,0.32)'; ctx.lineWidth = 1 * dpr
        const q = P(pk.quad)
        for (let i = 1; i < 4; i++) {
          const t = i / 4
          const ax = q[0].x + (q[3].x - q[0].x) * t, ay = q[0].y + (q[3].y - q[0].y) * t
          const bx = q[1].x + (q[2].x - q[1].x) * t, by = q[1].y + (q[2].y - q[1].y) * t
          ctx.beginPath(); ctx.moveTo(ax, ay)
          ctx.lineTo(ax + (bx - ax) * (0.35 + 0.45 * ((i * 5) % 3) / 2), ay + (by - ay) * 0.55)
          ctx.stroke()
        }
        ctx.restore()
      }

      if (pk.kind === 'orion') {
        orionPocket = pk
        // ⚠️ THE POCKET'S OWN QUAD, ALREADY PROJECTED -- not a second, separately
        // parameterised pocketAt() call. That used to duplicate the angle/height
        // numbers above by hand, and the two fell out of sync the moment one of
        // them changed, which is what let the DOM prompt drift off the real facet.
        screenQuad = P(pk.quad)
      }
      if (pk.kind === 'facing') facingPocket = pk
    }

    // the emitter: a bright ring and a bloom where the hologram leaves the table
    // ⚠️ AT THE WELL'S LIP, NOT ITS FLOOR. Drawn at the floor the bloom sits low and
    // reads as a lamp under the table rather than as the hologram leaving it — and
    // because the floor is a smaller radius it also pulled off the well's centre.
    const cEmit = project({ x: 0, y: 236, z: 0 })
    const rEmit = Math.abs(project({ x: 146, y: 236, z: 0 }).x - cEmit.x)
    const bloom = ctx.createRadialGradient(cEmit.x, cEmit.y, 0, cEmit.x, cEmit.y, rEmit * 1.15)
    bloom.addColorStop(0, 'rgba(200,240,255,0.62)')
    bloom.addColorStop(0.35, 'rgba(90,180,255,0.28)')
    bloom.addColorStop(1, 'rgba(90,180,255,0)')
    ctx.fillStyle = bloom
    ctx.beginPath(); ctx.ellipse(cEmit.x, cEmit.y, rEmit * 1.15, rEmit * 0.52, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = 'rgba(180,230,255,0.6)'; ctx.lineWidth = 2 * dpr
    ctx.beginPath(); ctx.ellipse(cEmit.x, cEmit.y, rEmit * 0.62, rEmit * 0.27, 0, 0, Math.PI * 2); ctx.stroke()

    // the FACING readout is drawn INTO the model, wrapped round the drum
    if (facing && facingPocket) {
      curvedText(ctx, project, 'FACING', {
        Rt: facingPocket.Rt, aCenter: facingPocket.a0 + facingPocket.ha * 0.62,
        y: 170, fs: 9, fill: 'rgba(150,215,255,0.5)', align: 'center',
      })
      curvedText(ctx, project, String(facing).toUpperCase(), {
        Rt: facingPocket.Rt, aCenter: facingPocket.a0 - facingPocket.ha * 0.12,
        y: 170, fs: 13, fill: 'rgba(228,246,255,0.95)', align: 'center',
      })
    }

  }

  function resize() { draw() }
  const onResize = () => resize()
  window.addEventListener('resize', onResize)
  draw()

  return {
    setFacing(label) { if (label === facing) return; facing = label; draw() },
    /** where the ORION glass landed on screen, for the live input to sit on */
    screen() { return screenQuad ? screenQuad.map((p) => ({ x: p.x / lastDpr, y: p.y / lastDpr })) : null },
    resize,
    dispose() { window.removeEventListener('resize', onResize); canvas.remove() },
  }
}
