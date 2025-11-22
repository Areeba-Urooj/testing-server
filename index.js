const express = require('express');
const { doSomeHeavyTask } = require('./util');

const app = express();
const PORT = process.env.PORT || 8000;

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
