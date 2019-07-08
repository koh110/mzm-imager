jest.mock('./logger')
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    rename: jest.fn(),
    readFile: jest.fn(),
    stat: jest.fn()
  }
}))
jest.mock('child_process')

import { getMockType } from '../../jest/testUtil'
import { IMAGE_MAGICK_PATH, IDENTICON_CACHE_DIR } from '../config'
import path from 'path'
import fs from 'fs'
import child_process from 'child_process'
import identicon, { getFileName } from './identicon'

const writeFileMock = getMockType(fs.promises.writeFile)
const renameMock = getMockType(fs.promises.rename)
const readFileMock = getMockType(fs.promises.readFile)
const statMock = getMockType(fs.promises.stat)
const execFileMock = getMockType(child_process.execFile)

test('identicon', async () => {
  const str = 'koh110'
  const size = 128
  const fileName = getFileName(str, size)

  writeFileMock.mockClear()
  renameMock.mockClear()

  const fileMock = Buffer.from('pngfile')
  execFileMock.mockImplementation((file, args, option, cb) => cb(null, { stdout: fileMock }))

  const png = await identicon(str, size)
  expect(png.toString()).toStrictEqual(fileMock.toString())

  expect(writeFileMock.mock.calls.length).toBe(1)
  expect(renameMock.mock.calls.length).toBe(1)
  expect(readFileMock.mock.calls.length).toBe(0)
  expect(execFileMock.mock.calls.length).toBe(1)

  const [, calledFileName] = renameMock.mock.calls[0]
  expect(calledFileName).toStrictEqual(path.resolve(IDENTICON_CACHE_DIR, fileName))

  const [imageMagickPath] = execFileMock.mock.calls[0]
  expect(imageMagickPath).toStrictEqual(IMAGE_MAGICK_PATH)
})

test('identicon (existFile)', async () => {
  const str = 'koh110'
  const size = 128
  const fileName = getFileName(str, size)

  writeFileMock.mockClear()
  renameMock.mockClear()

  statMock.mockReturnValue({ isFile: () => true })
  const fileMock = Buffer.from('pngfile')
  readFileMock.mockResolvedValue(fileMock)

  const png = await identicon(str, size)
  expect(png.toString()).toStrictEqual(fileMock.toString())

  expect(writeFileMock.mock.calls.length).toBe(0)
  expect(renameMock.mock.calls.length).toBe(0)
  expect(readFileMock.mock.calls.length).toBe(1)
  expect(execFileMock.mock.calls.length).toBe(1)

  const [calledFileName] = readFileMock.mock.calls[0]
  expect(calledFileName).toStrictEqual(path.resolve(IDENTICON_CACHE_DIR, fileName))
})
