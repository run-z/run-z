console.log('STALE');

// Prevent process from stopping
const id = setInterval(() => {
  clearInterval(id);
}, 5000);
