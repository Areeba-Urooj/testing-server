const doSomeHeavyTask = async () => {
  return new Promise((resolve, reject) => {
    // Artificial delay between 500ms and 1500ms to simulate heavy task
    const delay = Math.floor(Math.random() * 1000) + 500;

    setTimeout(() => {
      // Occasionally throw an error with 20% chance
      const errorChance = Math.random();
      if (errorChance < 0.2) {
        return reject(new Error('Simulated task failure'));
      }
      // Otherwise resolve successfully
      resolve();
    }, delay);
  });
};

module.exports = { doSomeHeavyTask };
