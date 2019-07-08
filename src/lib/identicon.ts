import crypto from 'crypto'
import path from 'path'
import { promisify } from 'util'
import { promises } from 'fs'
import { execFile } from 'child_process'
import { IMAGE_MAGICK_PATH, IDENTICON_CACHE_DIR } from '../config'

const { writeFile, rename, stat, readFile } = promises

const execFileAsync = promisify(execFile)

// size of each sprite
const spriteZ = 128
const spriteZCoord = spriteZ - 1

type RGB = {
  r: number
  g: number
  b: number
}

function getSprite(shape: number, rgb: RGB, rotation: number, tx: number, ty: number) {
  let points: number[][] = []
  switch (shape) {
    case 0: // triangle
      points = [[0.5, 1], [1, 0], [1, 1]]
      break
    case 1: // parallelogram
      points = [[0.5, 0], [1, 0], [0.5, 1], [0, 1]]
      break
    case 2: // mouse ears
      points = [[0.5, 0], [1, 0], [1, 1], [0.5, 1], [1, 0.5]]
      break
    case 3: // ribbon
      points = [[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1], [0.5, 0.5]]
      break
    case 4: // sails
      points = [[0, 0.5], [1, 0], [1, 1], [0, 1], [1, 0.5]]
      break
    case 5: // fins
      points = [[1, 0], [1, 1], [0.5, 1], [1, 0.5], [0.5, 0.5]]
      break
    case 6: // beak
      points = [[0, 0], [1, 0], [1, 0.5], [0, 0], [0.5, 1], [0, 1]]
      break
    case 7: // chevron
      points = [[0, 0], [0.5, 0], [1, 0.5], [0.5, 1], [0, 1], [0.5, 0.5]]
      break
    case 8: // fish
      points = [[0.5, 0], [0.5, 0.5], [1, 0.5], [1, 1], [0.5, 1], [0.5, 0.5], [0, 0.5]]
      break
    case 9: // kite
      points = [[0, 0], [1, 0], [0.5, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]]
      break
    case 10: // trough
      points = [[0, 0.5], [0.5, 1], [1, 0.5], [0.5, 0], [1, 0], [1, 1], [0, 1]]
      break
    case 11: // rays
      points = [[0.5, 0], [1, 0], [1, 1], [0.5, 1], [1, 0.75], [0.5, 0.5], [1, 0.25]]
      break
    case 12: // double rhombus
      points = [[0, 0.5], [0.5, 0], [0.5, 0.5], [1, 0], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]]
      break
    case 13: // crown
      points = [[0, 0], [1, 0], [1, 1], [0, 1], [1, 0.5], [0.5, 0.25], [0.5, 0.75], [0, 0.5], [0.5, 0.25]]
      break
    case 14: // radioactive
      points = [[0, 0.5], [0.5, 0.5], [0.5, 0], [1, 0], [0.5, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]]
      break
    default:
      // tiles
      points = [[0, 0], [1, 0], [0.5, 0.5], [0.5, 0], [0, 0.5], [1, 0.5], [0.5, 1], [0.5, 0.5], [0, 1]]
      break
  }

  // rotate the sprite
  let xOffs = 0
  let yOffs = 0
  switch (rotation) {
    case 0:
      xOffs = 0
      yOffs = 0
      break
    case 90:
      xOffs = 0
      yOffs = -spriteZCoord
      break
    case 180:
      xOffs = -spriteZCoord
      yOffs = -spriteZCoord
      break
    case 270:
      xOffs = -spriteZCoord
      yOffs = 0
      break
  }

  const polygon = points
    .map(point => {
      const [x, y] = point
      const px = x * spriteZCoord + xOffs
      const py = y * spriteZCoord + yOffs
      return `${px},${py}`
    })
    .join(' ')

  const ret = [
    'push graphic-context',
    `translate ${tx},${ty}`,
    `rotate ${rotation}`,
    `fill rgb(${rgb.r},${rgb.g},${rgb.b})`,
    `path 'M ${polygon} Z'`,
    `pop graphic-context`
  ].join(' ')
  return ret
}

/* generate sprite for center block */
function getCenter(shape: number, frgb: RGB, brgb: RGB, tx: number, ty: number) {
  let points: number[][] = []

  switch (shape) {
    case 0: // empty
      points = []
      break
    case 1: // fill
      points = [[0, 0], [1, 0], [1, 1], [0, 1]]
      break
    case 2: // diamond
      points = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]
      break
    case 3: // reverse diamond
      points = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0.5], [0.5, 1], [1, 0.5], [0.5, 0], [0, 0.5]]
      break
    case 4: // cross
      points = [
        [0.25, 0],
        [0.75, 0],
        [0.5, 0.5],
        [1, 0.25],
        [1, 0.75],
        [0.5, 0.5],
        [0.75, 1],
        [0.25, 1],
        [0.5, 0.5],
        [0, 0.75],
        [0, 0.25],
        [0.5, 0.5]
      ]
      break
    case 5: // morning star
      points = [[0, 0], [0.5, 0.25], [1, 0], [0.75, 0.5], [1, 1], [0.5, 0.75], [0, 1], [0.25, 0.5]]
      break
    case 6: // small square
      points = [[0.33, 0.33], [0.67, 0.33], [0.67, 0.67], [0.33, 0.67]]
      break
    case 7: // checkerboard
      points = [
        [0, 0],
        [0.33, 0],
        [0.33, 0.33],
        [0.66, 0.33],
        [0.67, 0],
        [1, 0],
        [1, 0.33],
        [0.67, 0.33],
        [0.67, 0.67],
        [1, 0.67],
        [1, 1],
        [0.67, 1],
        [0.67, 0.67],
        [0.33, 0.67],
        [0.33, 1],
        [0, 1],
        [0, 0.67],
        [0.33, 0.67],
        [0.33, 0.33],
        [0, 0.33]
      ]
      break
  }

  if (points.length === 0) return ''

  const polygon = points
    .map(point => {
      const [x, y] = point
      const px = x * spriteZCoord
      const py = y * spriteZCoord
      return `${px},${py}`
    })
    .join(' ')

  const ret = [
    'push graphic-context',
    `translate ${tx},${ty}`,
    `fill rgb(${brgb.r},${brgb.g},${brgb.b})`,
    `rectangle 0,0 ${spriteZCoord},${spriteZCoord}`,
    `fill rgb(${frgb.r},${frgb.g},${frgb.b})`,
    `path 'M ${polygon} Z'`,
    `pop graphic-context`
  ].join(' ')
  return ret
}

/* parse hash string */

function identicon(base: string, size, output) {
  const hash = crypto
    .createHash('sha1')
    .update(base + '\n', 'utf8')
    .digest('hex')

  const csh = parseInt(hash[0], 16) // corner sprite shape
  const ssh = parseInt(hash[1], 16) // side sprite shape
  const xsh = parseInt(hash[2], 16) & 7 // center sprite shape
  const cro = parseInt(hash[3], 16) & 3 // corner sprite rotation
  const sro = parseInt(hash[4], 16) & 3 // side sprite rotation
  const xbg = parseInt(hash[5], 16) % 2 // center sprite background

  // corner sprite foreground color
  const cfr = parseInt(hash[6] + hash[7], 16)
  const cfg = parseInt(hash[8] + hash[9], 16)
  const cfb = parseInt(hash[10] + hash[11], 16)

  // side sprite foreground color
  const sfr = parseInt(hash[12] + hash[13], 16)
  const sfg = parseInt(hash[14] + hash[15], 16)
  const sfb = parseInt(hash[16] + hash[17], 16)

  const crgb: RGB = { r: cfr, g: cfg, b: cfb }
  const srgb: RGB = { r: cfr, g: cfg, b: cfb }

  const draw = [
    getSprite(csh, crgb, (cro * 270) % 360, 0, 0),
    getSprite(csh, crgb, (cro * 270 + 90) % 360, spriteZ * 2, 0),
    getSprite(csh, crgb, (cro * 270 + 180) % 360, spriteZ * 2, spriteZ * 2),
    getSprite(csh, crgb, (cro * 270 + 270) % 360, 0, spriteZ * 2),
    getSprite(ssh, srgb, (sro * 270) % 360, spriteZ, 0),
    getSprite(ssh, srgb, (sro * 270 + 90) % 360, spriteZ * 2, spriteZ),
    getSprite(ssh, srgb, (sro * 270 + 180) % 360, spriteZ, spriteZ * 2),
    getSprite(ssh, srgb, (sro * 270 + 270) % 360, 0, spriteZ)
  ]

  const dr = cfr - sfr
  const dg = cfg - sfg
  const db = cfb - sfb

  if (xbg > 0 && (Math.abs(dr) > 127 || Math.abs(dg) > 127 || Math.abs(db) > 127)) {
    draw.push(getCenter(xsh, crgb, srgb, spriteZ, spriteZ))
  } else {
    draw.push(getCenter(xsh, crgb, { r: 255, g: 255, b: 255 }, spriteZ, spriteZ))
  }

  return [
    '-size',
    `${spriteZ * 3}x${spriteZ * 3}`,
    'xc:white',
    '-fill',
    'none',
    '-draw',
    draw.join(' '),
    '-scale',
    `${size}x${size}`,
    `png:${output}`
  ]
}

async function _generate(str: string, size: number) {
  const identiconOptions = identicon(str, size, '-')
  const execOptions = { encoding: 'binary', timeout: 10000, maxBuffer: 6000 * 1024 }

  const { stdout } = await execFileAsync(IMAGE_MAGICK_PATH, identiconOptions, execOptions)

  return stdout
}

export function getFileName(str: string, size: number) {
  const fileName = crypto
    .createHash('md5')
    .update(`${str}\n${size}`)
    .digest('hex')
  return `${fileName}.png`
}

export default async function generate(str: string, size: number, dir?: string) {
  if (!str) {
    throw new Error('empty string')
  }

  const cacheDir = dir ? dir : IDENTICON_CACHE_DIR
  const fileName = getFileName(str, size)
  const file = path.join(cacheDir, fileName)

  try {
    const st = await stat(file)
    if (!st.isFile()) {
      throw new Error('unknown file')
    }
  } catch (e) {
    const buffer = await _generate(str, size)
    const rand = (0x2000000000 + Math.random() + (Date.now() & 0x1f)).toString(32)
    const randName = `${fileName}_${rand}`
    const binary = Buffer.from(buffer as string, 'binary')
    await writeFile(randName, binary)
    await rename(randName, file)
    return binary
  }

  const data = await readFile(file)
  return data
}
