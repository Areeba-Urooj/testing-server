const express = require('express');
const promClient = require('prom-client');
const responseTime = require('response-time');
const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");

const options = {
  transports: [
    new LokiTransport({
      host: "http://127.0.0.1:3100"
    })
  ]
};

const logger = createLogger(options);
const { doSomeHeavyTask, collectDefaultMetrics } = require('./util');

const app = express();
const PORT = process.env.PORT || 8000;

// Create a Histogram metric for HTTP request durations
const httpRequestDurationMilliseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000]
});

// Collect default metrics
collectDefaultMetrics(promClient);

// Use response-time middleware to measure response time and record in Histogram
app.use(responseTime((req, res, time) => {
  if (req.route && req.route.path) {
    httpRequestDurationMilliseconds.labels(req.method, req.route.path, res.statusCode).observe(time);
  } else {
    // fallback for unmatched routes or middleware
    httpRequestDurationMilliseconds.labels(req.method, req.originalUrl || req.url, res.statusCode).observe(time);
  }
}));

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Root endpoint for basic connectivity testing
app.get('/', (req, res) => {
  logger.info('Req came on / router');
  res.status(200).json({
    status: 'OK',
    message: 'Express testing server is running',
  });
});

// Slow/heavy task endpoint
app.get('/slow', async (req, res) => {
  logger.info('Req came on /slow router');
  const startTime = Date.now();
  try {
    await doSomeHeavyTask();
    const timeTaken = Date.now() - startTime;
    res.status(200).json({
      status: 'Success',
      message: `Heavy task completed in ${timeTaken}ms`,
    });
  } catch (error) {
    logger.error(error.message);
    res.status(500).json({
      status: 'Error',
      error: 'Internal Server Error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express testing server is running on port ${PORT}`);
});