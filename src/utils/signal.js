function classifySignal(status, errorText) {
  if (errorText && String(errorText).toLowerCase().includes('timeout')) {
    return 'TIMEOUT';
  }
  if (status >= 200 && status < 400) {
    return 'UP';
  }
  if (status >= 400 && status < 500) {
    return 'WARN';
  }
  if (status >= 500 || status === 0) {
    return 'DOWN';
  }
  return 'DOWN';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  classifySignal,
  sleep
};
