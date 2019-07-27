import cluster from 'cluster'
import http from 'http'
import express from 'express'
import logger from './lib/logger'
import identicon from './lib/identicon'
import { WORKER_NUM, LISTEN } from './config'

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

if (cluster.isMaster) {
  for (let i = 0; i < WORKER_NUM; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    const s = signal || code
    logger.info(`exit worker #${worker.process.pid} (${s})`)
    cluster.fork()
  })
} else {
  server.listen(LISTEN, () => {
    logger.info('Listening on', server.address())
  })
}
