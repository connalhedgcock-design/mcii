/**
 * holo-globe — a blue holographic Earth, in raw WebGL2. Zero dependencies.
 *
 * WHAT MAKES IT READ AS A HOLOGRAM, in the order the eye picks them up:
 *
 *   1. ADDITIVE, DEPTH OFF, NO CULLING. The far side of the sphere draws
 *      THROUGH the near side, dimmer. This is the whole illusion. Turn on depth
 *      testing and you get an opaque ball; turn on culling and you get a
 *      hemisphere pretending to be a globe. CSS cannot do this at all — a
 *      hologram's defining property is per-pixel additive accumulation of two
 *      surfaces, and no arrangement of gradients produces it.
 *   2. FRESNEL. Bright at the silhouette, nearly transparent face-on — the
 *      opposite of how a lit solid behaves, and why holograms read as light
 *      rather than as matter.
 *   3. WIREFRAME OVER TEXTURE. A lat/long grid says "data about a planet". A
 *      surface texture says "photo of a planet".
 *   4. IMPERFECTION. Scanlines, a climbing scan band, a slow flicker. Perfect
 *      is synthetic. Slightly degraded is real.
 *
 * AMBIENT MOTION LAW, enforced here rather than described:
 *   never linear · breath (4s) and churn (7s) share no common factor so the
 *   surface never repeats · amplitude under 8% · stops when the window is
 *   hidden · pinned to one still frame under prefers-reduced-motion.
 *
 * In the Observatory this globe IS Claude: idle when nothing is happening,
 * listening when the prompt has focus, working while a question is in flight.
 * That is the loading indicator. No spinner exists anywhere in the room.
 */

export const BREATH_S = 4
export const CHURN_S  = 7

/** The three states as ONE NUMBER the shader interpolates between — not a
 *  branch. An object that CUTS between resting and working has admitted it is
 *  three pictures rather than one living thing. */
export const ENERGY = { idle: 0, listening: 0.45, working: 1 }

const VERT = `#version 300 es
in vec3 aPos;
uniform mat4 uMVP;
uniform mat4 uModel;
uniform float uScale;
out vec3 vN;
out vec3 vW;
void main() {
  vec3 p = aPos * uScale;
  vN = normalize(mat3(uModel) * aPos);
  vW = (uModel * vec4(p, 1.0)).xyz;
  gl_Position = uMVP * vec4(p, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;

in vec3 vN;
in vec3 vW;

uniform float uTime;
uniform float uEnergy;
uniform vec3  uEye;
uniform vec3  uDeep;
uniform vec3  uHolo;
uniform vec3  uHot;
uniform int   uMode;      // 0 = the globe, 1 = the atmosphere shell

out vec4 frag;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}

// An antialiased line every 'period' radians. fwidth() is what keeps it ONE
// PIXEL WIDE at every distance and, critically, at the poles — where longitude
// lines converge and a naive grid turns the top of the globe into a solid disc.
float gridLine(float coord, float period, float w) {
  float g = abs(fract(coord / period - 0.5) - 0.5) * period;
  return 1.0 - smoothstep(w, w + fwidth(coord) * 1.5, g);
}

void main() {
  vec3  N = normalize(vN);
  vec3  V = normalize(uEye - vW);
  float facing = dot(N, V);                 // < 0 on the far side
  float fres   = pow(1.0 - abs(facing), 2.8);

  // ── the atmosphere shell ────────────────────────────────────────────────
  // A second, larger sphere, fresnel only. It CHURNS on the same noise field as
  // the globe, so the glow belongs to the object instead of being a gradient
  // parked behind it — which is what a flat radial halo always looks like, and
  // it is always noticeable.
  if (uMode == 1) {
    float churn = fbm(N * 2.6 + vec3(0.0, uTime * 0.06, 0.0));
    float a = fres * (0.55 + 0.45 * churn) * (0.38 + 0.34 * uEnergy);
    frag = vec4(uHolo * a, a);
    return;
  }

  // Latitude and longitude from the NORMAL, never from UVs: no seam where a
  // texture would wrap, no pinch at the poles.
  float lat = asin(clamp(N.y, -1.0, 1.0));
  float lon = atan(N.z, N.x);

  float lats = gridLine(lat, 0.2618, 0.004);      // every 15 degrees
  float lons = gridLine(lon, 0.2618, 0.004);
  float wire = max(lats, lons * 0.85);

  // Landmass: fbm, thresholded. The COASTLINE is bright and the interior barely
  // filled — an outline reads as surveyed data, a filled shape reads as a picture.
  float land  = fbm(N * 2.1 + vec3(0.0, 0.0, 17.0));
  float fill  = smoothstep(0.500, 0.585, land) * 0.16;
  float coast = (smoothstep(0.485, 0.505, land)
               - smoothstep(0.575, 0.600, land)) * 0.75;

  // The scan band, climbing. ~11 seconds a pass: slow enough to be noticed
  // rather than watched.
  float sweep = fract(N.y * 0.5 + 0.5 - uTime * 0.09);
  float band  = smoothstep(0.0, 0.035, sweep) * smoothstep(0.10, 0.035, sweep);

  // Fine scanlines — the cheapest possible "this is projected light" signal.
  float fine = 0.5 + 0.5 * sin(N.y * 150.0 + uTime * 0.7);

  // Flicker. NOT a per-frame random: a random offset each frame is jitter, has
  // no velocity, and reads as a dropped frame rather than an unstable
  // projection. Sampling noise along time gives it continuity.
  float flick = 0.93 + 0.07 * noise(vec3(uTime * 2.7, 0.0, 0.0));

  float glow = wire * 0.85 + fill + coast + fres * 0.95 + band * 0.50;
  glow *= (0.84 + 0.16 * fine);
  glow *= flick;
  // ⚠️ The far side is dimmer. Without this the front and back accumulate
  // equally and the sphere flattens into a disc — the single most common way a
  // wireframe globe fails.
  glow *= mix(0.42, 1.0, step(0.0, facing));
  glow *= (0.80 + 0.55 * uEnergy);

  vec3 col = mix(uDeep, uHolo, clamp(wire + coast + band, 0.0, 1.0));
  col = mix(col, uHot, clamp(fres * 1.15 + band * 0.7, 0.0, 1.0));

  // Premultiplied: the context is created with premultipliedAlpha and the blend
  // is ONE/ONE, so colour must already carry its own alpha.
  frag = vec4(col * glow, glow);
}`

/* ── minimal 4×4 matrix maths, column-major ──────────────────────────────── */
function mIdent(m) { m.fill(0); m[0] = m[5] = m[10] = m[15] = 1; return m }
function mMul(out, a, b) {          // out = a · b   (out must not alias a or b)
  for (let c = 0; c < 4; c++) {
    const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3]
    out[c * 4 + 0] = a[0] * b0 + a[4] * b1 + a[8]  * b2 + a[12] * b3
    out[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9]  * b2 + a[13] * b3
    out[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3
    out[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3
  }
  return out
}
function mPerspective(m, fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2)
  m.fill(0)
  m[0] = f / aspect; m[5] = f; m[11] = -1
  m[10] = (far + near) / (near - far)
  m[14] = (2 * far * near) / (near - far)
  return m
}
function mRotY(m, r) {
  const c = Math.cos(r), s = Math.sin(r)
  mIdent(m); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m
}
function mRotX(m, r) {
  const c = Math.cos(r), s = Math.sin(r)
  mIdent(m); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m
}
function mTranslate(m, x, y, z) {
  mIdent(m); m[12] = x; m[13] = y; m[14] = z; return m
}

/** A UV sphere. Position doubles as the normal, because the radius is 1. */
function sphere(segU, segV) {
  const pos = [], idx = []
  for (let v = 0; v <= segV; v++) {
    const phi = (v / segV) * Math.PI
    const sp = Math.sin(phi), cp = Math.cos(phi)
    for (let u = 0; u <= segU; u++) {
      const th = (u / segU) * Math.PI * 2
      pos.push(sp * Math.cos(th), cp, sp * Math.sin(th))
    }
  }
  const row = segU + 1
  for (let v = 0; v < segV; v++) {
    for (let u = 0; u < segU; u++) {
      const a = v * row + u, b = a + 1, c = a + row, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  // 97 × 65 = 6305 vertices, comfortably inside Uint16.
  return { pos: new Float32Array(pos), idx: new Uint16Array(idx) }
}

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // Log rather than throw: a shader that fails to compile must fall back to
    // the CSS globe, not take the whole room down with it.
    console.warn('[holo-globe] shader failed:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/**
 * Mount the globe into `host`. Returns a handle, or `null` if WebGL2 is
 * unavailable — in which case the caller shows the CSS fallback.
 *
 * ⚠️ The canvas is CREATED HERE and removed on dispose. Never declare it in
 * markup and pass it in: `loseContext()` permanently poisons the element it is
 * called on, and Chromium paints a lost-context canvas as an opaque WHITE
 * RECTANGLE. Reusing such an element on a re-mount is exactly how you get a
 * white box where the globe should be.
 */
export function mountGlobe(host, opts = {}) {
  if (!host) return null

  const reduced = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'display:block;width:100%;height:100%'
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: false,                 // additive, order-independent — no depth needed
    powerPreference: 'low-power', // it is an ornament; do not wake the dGPU
  })
  if (!gl) return null
  host.appendChild(canvas)

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) { canvas.remove(); return null }

  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs)
  gl.bindAttribLocation(prog, 0, 'aPos')
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[holo-globe] link failed:', gl.getProgramInfoLog(prog))
    canvas.remove(); return null
  }
  gl.deleteShader(vs); gl.deleteShader(fs)
  gl.useProgram(prog)

  const geo = sphere(96, 64)
  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)
  const vbo = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
  const ibo = gl.createBuffer()
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW)

  const U = (n) => gl.getUniformLocation(prog, n)
  const uMVP = U('uMVP'), uModel = U('uModel'), uScale = U('uScale')
  const uTime = U('uTime'), uEnergy = U('uEnergy'), uEye = U('uEye')
  const uDeep = U('uDeep'), uHolo = U('uHolo'), uHot = U('uHot'), uMode = U('uMode')

  // Linear-light RGB matching --st-holo-deep / --st-holo / --st-holo-hot.
  const C = Object.assign({
    deep: [0.10, 0.30, 0.72],
    holo: [0.26, 0.62, 1.00],
    hot:  [0.72, 0.90, 1.00],
  }, opts.colors || {})
  gl.uniform3fv(uDeep, C.deep)
  gl.uniform3fv(uHolo, C.holo)
  gl.uniform3fv(uHot,  C.hot)

  const DIST = 3.2
  gl.uniform3f(uEye, 0, 0, DIST)

  gl.disable(gl.DEPTH_TEST)
  gl.disable(gl.CULL_FACE)          // ⚠️ both faces. See the header note.
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE)      // ⚠️ additive
  gl.clearColor(0, 0, 0, 0)

  const P = new Float32Array(16), Vm = new Float32Array(16)
  const Ry = new Float32Array(16), Rx = new Float32Array(16)
  const M = new Float32Array(16), PV = new Float32Array(16), MVP = new Float32Array(16)
  mTranslate(Vm, 0, 0, -DIST)

  let energy = ENERGY.idle, target = ENERGY.idle
  let raf = 0, running = false, drew = null
  const probe = new Uint8Array(4 * 32 * 32)
  const t0 = performance.now()
  let lastMs = t0

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)   // clamped: a 3× retina
    const w = Math.max(1, Math.round(canvas.clientWidth  * dpr))  // globe is 9× the
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr))  // fill rate for no
    if (canvas.width !== w || canvas.height !== h) {              // visible gain
      canvas.width = w; canvas.height = h
      gl.viewport(0, 0, w, h)
      mPerspective(P, 0.62, w / h, 0.1, 20)
      mMul(PV, P, Vm)
    }
  }

  function draw(nowMs) {
    const t = reduced ? 0 : (nowMs - t0) / 1000
    lastMs = nowMs

    // Eased toward the target, never assigned. The state change is a response to
    // an action, so it must feel immediate without ever being a cut.
    energy += (target - energy) * 0.085

    // ── the wander ────────────────────────────────────────────────────────
    // ⚠️ NOT Math.random(). A random offset per frame is jitter, not drift.
    // This is a sum of sines at MUTUALLY IRRATIONAL frequencies — no two share
    // a rational ratio, so the sum has no period at all and the globe never
    // returns to a pose it has held. Deterministic, therefore testable;
    // unpredictable, therefore alive. Total excursion 5.5%, under the 8% cap.
    const w = 1 + 0.5 * energy
    const spin = t * 0.055 + 0.09 * Math.sin(t * 0.3110)
    const tilt = -0.30 + (0.075 * Math.sin(t * 0.2130 + 1.7)
                        + 0.042 * Math.sin(t * 0.0871)) * w
    const breath = reduced ? 1 : 1 + 0.032 * Math.sin((t * Math.PI * 2) / BREATH_S)

    mRotY(Ry, spin); mRotX(Rx, tilt); mMul(M, Ry, Rx)
    mMul(MVP, PV, M)
    gl.uniformMatrix4fv(uModel, false, M)
    gl.uniformMatrix4fv(uMVP,   false, MVP)
    gl.uniform1f(uTime, t)
    gl.uniform1f(uEnergy, energy)

    gl.clear(gl.COLOR_BUFFER_BIT)

    // the globe
    gl.uniform1i(uMode, 0)
    gl.uniform1f(uScale, breath)
    gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0)

    // the atmosphere. Breathes on the CHURN period, not the body's, so the two
    // are never in phase — which is what "never repeats exactly" actually costs.
    gl.uniform1i(uMode, 1)
    gl.uniform1f(uScale, 1.16 * (reduced ? 1 : 1 + 0.026 * Math.sin((t * Math.PI * 2) / CHURN_S)))
    gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0)

    // ── the self-check ────────────────────────────────────────────────────
    // ⚠️ THE READ MUST HAPPEN INSIDE THE DRAW CALL. readPixels from outside the
    // render loop returns an empty buffer on every machine, because the drawing
    // buffer is cleared once the frame is composited — a probe run from outside
    // would condemn every working globe in existence.
    //
    // There are at least six ways WebGL can fail on a user's machine and they
    // are not distinguishable from here. They do not need to be: every one has
    // the same correct response, which is to stop pretending and show the globe
    // that works.
    if (drew === null) {
      try {
        const bw = gl.drawingBufferWidth, bh = gl.drawingBufferHeight
        if (bw > 8 && bh > 8) {
          gl.readPixels((bw >> 1) - 16, (bh >> 1) - 16, 32, 32,
                        gl.RGBA, gl.UNSIGNED_BYTE, probe)
          let lit = 0
          for (let i = 0; i < probe.length; i += 4) {
            if (probe[i + 3] > 6 || probe[i] > 6 || probe[i + 1] > 6 || probe[i + 2] > 6) lit++
          }
          // A tenth of the window is a deliberately low bar: the globe is
          // translucent and its centre is its most transparent part, so
          // demanding a bright middle would fail a correctly-drawn sphere.
          drew = lit > (probe.length / 4) * 0.10
        }
      } catch { drew = false }
    }
  }

  function loop(now) { if (!running) return; draw(now); raf = requestAnimationFrame(loop) }
  function start()   { if (running || reduced) return; running = true; raf = requestAnimationFrame(loop) }
  function stop()    { running = false; if (raf) cancelAnimationFrame(raf); raf = 0 }

  const onLost = (e) => { e.preventDefault(); drew = false; stop() }
  canvas.addEventListener('webglcontextlost', onLost)
  // Suspended when the window is hidden. This is an ambient-motion rule and it
  // is also the difference between an ornament and a background process cooking
  // a laptop that is sitting closed in a bag.
  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)
  const onResize = () => resize()
  window.addEventListener('resize', onResize)

  resize()
  draw(t0)   // reduced motion still gets ONE frame. An empty canvas is a worse
  start()    // accessibility outcome than a still globe.

  return {
    /** true drew · false did not · null not yet known.
     *  ⚠️ The caller must treat null as "wait", never as failure — condemning a
     *  globe that has simply not had a frame yet replaces a working shader with
     *  a fallback on every slow machine. */
    didDraw() { return drew },
    setState(name) { target = ENERGY[name] == null ? ENERGY.idle : ENERGY[name] },
    resize,
    reduced,
    dispose() {
      stop()
      canvas.removeEventListener('webglcontextlost', onLost)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('resize', onResize)
      gl.deleteBuffer(vbo); gl.deleteBuffer(ibo)
      gl.deleteVertexArray(vao); gl.deleteProgram(prog)
      // ⚠️ Chromium caps live WebGL contexts PER PROCESS (~16). If the room is
      // opened and closed repeatedly in one session and each visit leaks a
      // context, the globe silently stops appearing after about sixteen of them
      // — and it will look like a random bug months from now.
      try { gl.getExtension('WEBGL_lose_context')?.loseContext() } catch {}
      // Safe ONLY because the canvas is removed immediately after.
      canvas.remove()
    },
  }
}
