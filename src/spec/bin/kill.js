// Prevent process from stopping
const id = setInterval(
    () => {
      clearInterval(id);
    },
    1000,
);
process.kill(process.pid, 'SIGKILL');
