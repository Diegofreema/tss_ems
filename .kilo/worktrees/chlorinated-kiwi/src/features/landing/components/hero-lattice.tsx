import { useEffect, useRef } from 'react'

/** A 6×6 lattice: the school's records drawn as one structure. */
const N = 6
const SP = 1.06
/** Half the width of a block, in scene units. */
const BLOCK = SP * 0.32

type Cell = { x: number; z: number; base: number; phase: number; accent: boolean }

/**
 * The same lattice on every visit: heights, breathing offsets and which blocks
 * are brand-coloured all come from a hash of the cell's own coordinates, so nothing is
 * random and nothing has to be stored.
 */
function buildCells(): Cell[] {
  const cells: Cell[] = []
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const seed = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453
      const r = seed - Math.floor(seed)
      cells.push({
        x: (i - (N - 1) / 2) * SP,
        z: (j - (N - 1) / 2) * SP,
        base: 0.35 + r * 1.55,
        phase: r * Math.PI * 2,
        // Roughly one block in seven.
        accent: r > 0.86,
      })
    }
  }
  return cells
}

/** The scene paints in the page's own colours, so it follows the theme. */
function palette(el: Element) {
  const style = getComputedStyle(el)
  const token = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback
  return {
    ink: token('--ems-ink', '#1c1d20'),
    ground: token('--ems-ground', '#f2f2f4'),
    accent: token('--ems-brand', '#1349ec'),
    accentEdge: token('--ems-brand-700', '#0034ae'),
  }
}

type Point = [number, number, number]

/** Yaw about Y, then pitch about X. */
function rotate(p: Point, cy: number, sy: number, cp: number, sp: number): Point {
  const x = p[0] * cy - p[2] * sy
  const z = p[0] * sy + p[2] * cy
  return [x, p[1] * cp - z * sp, p[1] * sp + z * cp]
}

/**
 * Draws the lattice until the returned function is called.
 *
 * Three pieces of hard-won robustness are kept from the prototype: every frame
 * is wrapped so one bad one cannot kill the loop, the loop falls back to a
 * timer where `requestAnimationFrame` never fires at all, and the canvas is
 * re-measured on a ResizeObserver as well as on resize.
 */
function startScene(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const cells = buildCells()
  const tone = palette(canvas)
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let dead = false

  let width = 0
  let height = 0
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    canvas.width = Math.max(1, Math.round(width * dpr))
    canvas.height = Math.max(1, Math.round(height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)

  // Where the lattice is asked to look, and where it has eased to so far.
  let targetYaw = 0.5
  let targetPitch = 0.42
  let yaw = 0.5
  let pitch = 0.42

  const onMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    const nx = (event.clientX - rect.left) / Math.max(1, rect.width) - 0.5
    const ny = (event.clientY - rect.top) / Math.max(1, rect.height) - 0.5
    targetYaw = 0.5 + nx * 1.25
    targetPitch = 0.42 - ny * 0.42
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  /** A phone has no pointer, so the lattice follows the tilt of the handset. */
  const onTilt = (event: DeviceOrientationEvent) => {
    if (event.gamma == null) return
    targetYaw = 0.5 + Math.max(-1, Math.min(1, event.gamma / 40)) * 0.8
    targetPitch = 0.42 + Math.max(-1, Math.min(1, ((event.beta ?? 45) - 45) / 45)) * 0.25
  }
  window.addEventListener('deviceorientation', onTilt)

  const start = performance.now()

  const draw = (now: number) => {
    if (!width || !height) resize()
    const t = (now - start) / 1000
    yaw += (targetYaw - yaw) * 0.055
    pitch += (targetPitch - pitch) * 0.055
    const drift = yaw + (still ? 0 : Math.sin(t * 0.11) * 0.16)

    ctx.clearRect(0, 0, width, height)
    const compact = width < 900
    const scale = Math.min(width, height) * (compact ? 0.19 : 0.2)
    const cx = compact ? width * 0.5 : width * 0.74
    const cy = compact ? height * 0.34 : height * 0.44
    const alpha = compact ? 0.5 : 0.95

    const cosY = Math.cos(drift)
    const sinY = Math.sin(drift)
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)
    const project = (p: Point): Point => {
      const r = rotate(p, cosY, sinY, cosP, sinP)
      const d = 9 / (9 + r[2])
      return [cx + r[0] * scale * d, cy - r[1] * scale * d, r[2]]
    }

    ctx.lineJoin = 'miter'

    // The ground the blocks stand on.
    ctx.globalAlpha = alpha * 0.16
    ctx.strokeStyle = tone.ink
    ctx.lineWidth = 1
    const half = ((N - 1) / 2) * SP + SP * 0.5
    for (let k = 0; k <= N; k++) {
      const v = -half + k * SP
      const line = (a: Point, b: Point) => {
        ctx.beginPath()
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
        ctx.stroke()
      }
      line(project([v, 0, -half]), project([v, 0, half]))
      line(project([-half, 0, v]), project([half, 0, v]))
    }

    // Far to near, so a near block's filled top occludes what stands behind it.
    const blocks = cells
      .map((cell) => ({
        cell,
        top: still ? cell.base : cell.base * (1 + Math.sin(t * 0.6 + cell.phase) * 0.16),
        depth: rotate([cell.x, 0, cell.z], cosY, sinY, cosP, sinP)[2],
      }))
      .sort((a, b) => b.depth - a.depth)

    for (const { cell, top: h } of blocks) {
      const x0 = cell.x - BLOCK
      const x1 = cell.x + BLOCK
      const z0 = cell.z - BLOCK
      const z1 = cell.z + BLOCK
      const roof = (
        [
          [x0, h, z0],
          [x1, h, z0],
          [x1, h, z1],
          [x0, h, z1],
        ] as Point[]
      ).map(project)
      const floor = (
        [
          [x0, 0, z0],
          [x1, 0, z0],
          [x1, 0, z1],
          [x0, 0, z1],
        ] as Point[]
      ).map(project)

      ctx.globalAlpha = alpha
      ctx.beginPath()
      ctx.moveTo(roof[0][0], roof[0][1])
      for (let k = 1; k < 4; k++) ctx.lineTo(roof[k][0], roof[k][1])
      ctx.closePath()
      ctx.fillStyle = cell.accent ? tone.accent : tone.ground
      ctx.fill()

      ctx.globalAlpha = cell.accent ? alpha : alpha * 0.62
      ctx.strokeStyle = cell.accent ? tone.accentEdge : tone.ink
      ctx.lineWidth = cell.accent ? 2 : 1.4
      ctx.stroke()

      for (let k = 0; k < 4; k++) {
        ctx.beginPath()
        ctx.moveTo(floor[k][0], floor[k][1])
        ctx.lineTo(roof[k][0], roof[k][1])
        ctx.stroke()
      }
    }

    ctx.globalAlpha = 1
  }

  let raf = 0
  let timer = 0
  let painted = false
  let mode: 'raf' | 'timer' = 'raf'
  const frame = (now: number) => {
    if (dead) return
    try {
      draw(now)
      painted = true
    } catch {
      // One bad frame must not take the loop down with it.
    }
    if (mode === 'raf') raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)

  // Some embedded and backgrounded contexts never fire a frame at all.
  const watchdog = window.setTimeout(() => {
    if (painted || dead) return
    mode = 'timer'
    cancelAnimationFrame(raf)
    timer = window.setInterval(() => frame(performance.now()), 40)
  }, 700)

  return () => {
    dead = true
    cancelAnimationFrame(raf)
    clearTimeout(watchdog)
    clearInterval(timer)
    observer.disconnect()
    window.removeEventListener('resize', resize)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('deviceorientation', onTilt)
  }
}

/** The hero's backdrop. Decorative, and told so. */
export function HeroLattice() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    let stop = startScene(canvas)
    // A tab that was hidden, or a page restored from the back/forward cache,
    // comes back with a dead loop; it is cheaper to start again than to prove
    // it is still running.
    const restart = () => {
      if (document.hidden) return
      stop()
      stop = startScene(canvas)
    }
    document.addEventListener('visibilitychange', restart)
    window.addEventListener('pageshow', restart)

    return () => {
      document.removeEventListener('visibilitychange', restart)
      window.removeEventListener('pageshow', restart)
      stop()
    }
  }, [])

  return <canvas ref={ref} aria-hidden className="absolute inset-0 block size-full" />
}
