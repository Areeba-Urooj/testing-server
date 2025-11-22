const express = require('express');
const promClient = require('prom-client');
const { doSomeHeavyTask, collectDefaultMetrics } = require('./util');

const app = express();
const PORT = process.env.PORT || 8000;

// Collect default metrics
collectDefaultMetrics(promClient);

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
  res.status(200).json({
    status: 'OK',
    message: 'Express testing server is running',
  });
});

// Slow/heavy task endpoint
app.get('/slow', async (req, res) => {
  const startTime = Date.now();
  try {
    await doSomeHeavyTask();
    const timeTaken = Date.now() - startTime;
    res.status(200).json({
      status: 'Success',
      message: `Heavy task completed in ${timeTaken}ms`,
    });
  } catch (error) {
    res.status(500).json({
      status: 'Error',
      error: 'Internal Server Error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`Express testing server is running on port ${PORT}`);
});
