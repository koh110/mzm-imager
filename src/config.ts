import path from 'path'
import { config } from 'dotenv'
config()

export const LISTEN = 3002

export const IMAGE_MAGICK_PATH = process.env.IMAGE_MAGICK_PATH

export const IDENTICON_CACHE_DIR = process.env.IDENTICON_CACHE_DIR
  ? process.env.IDENTICON_CACHE_DIR
  : path.resolve(__dirname, '../cache')
