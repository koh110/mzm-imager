import http from 'http'
import express from 'express'
import logger from './lib/logger'
import { LISTEN } from './config'

const app = express()

app.get('/', (req, res) => {
  res.status(200).send('hello')
})

// 必ず最後に use する
app.use((err, _req, res, _next) => {
  res.status(500).send('Internal Server Error')
  logger.error('[Internal Server Error]', err)
})

const server = http.createServer(app)

server.listen(LISTEN, () => {
  logger.info('Listening on', server.address())
})
