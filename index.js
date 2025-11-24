const express = require('express');
const promClient = require('prom-client');
const responseTime = require('response-time');
const { createLogger, transports } = require("winston");
const LokiTransport = require("winston-loki");

const options = {
    transports: [
        new LokiTransport({
            host: "http://loki:3100",
            labels: { app: 'nodejs-express-app', environment: 'dev' },
            json: true,
        })
    ]
};
const logger = createLogger(options);

const { doSomeHeavyTask } = require('./util');

const app = express();
const PORT = process.env.PORT || 8000;

const registry = new promClient.Registry();
promClient.collectDefaultMetrics({ register: registry });

const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
    registers: [registry]
});

const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [registry]
});

app.use(responseTime((req, res, time) => {
    const route = req.route && req.route.path ? req.route.path : req.originalUrl || req.url;

    if (route !== '/metrics') {
        const durationInSeconds = time / 1000;
        const statusCode = res.statusCode ? res.statusCode.toString() : '999';

        httpRequestDurationSeconds.labels(req.method, route, statusCode).observe(durationInSeconds);
        httpRequestTotal.labels(req.method, route, statusCode).inc();
    }
}));

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch (err) {
        console.error("Error generating metrics:", err);
        res.status(500).end(String(err));
    }
});

app.get('/', (req, res) => {
    logger.info("Request received on root endpoint", { method: req.method, route: '/' });
    res.status(200).json({
        status: 'OK',
        message: 'Express testing server is running',
    });
});

app.get('/slow', async (req, res) => {
    const startTime = Date.now();
    try {
        logger.info("Starting heavy task on /slow endpoint");
        await doSomeHeavyTask();
        const timeTaken = Date.now() - startTime;
        logger.info("Heavy task completed successfully", { time: timeTaken });

        res.status(200).json({
            status: 'Success',
            message: `Heavy task completed in ${timeTaken}ms`,
        });
    } catch (error) {
        logger.error("Internal Server Error during heavy task", { error: error.message, stack: error.stack });
        res.status(500).json({
            status: 'Error',
            error: 'Internal Server Error',
        });
    }
});

app.listen(PORT, () => {
    console.log(`Express testing server is running on port ${PORT}`);
});
