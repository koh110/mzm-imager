import http from 'http'
import express from 'express'
import logger from './lib/logger'
import identicon from './lib/identicon'
import { LISTEN } from './config'

const app = express()

app.get('/api/imager/icon/:id', (req, res) => {
  identicon(req.params.id, 128)
    .then(data => {
      res.contentType('image/png')
      res.send(data)
    })
    .catch(err => {
      logger.error('[identicon]', err)
      res.status(500).send('Internal Server Error')
    })
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
