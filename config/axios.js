module.exports = {
  baseURL: 'https://ev-server-whfmnthsix.cn-hangzhou.fcapp.run/api', // 线上联调
  // baseURL: 'http://192.168.1.104:3000/api', // 本地联调
  timeout: 5000,
  retry: 3,
  retryDelay: 100,
  __retryCount: 0,
  headers: { 'Content-Type': 'application/json' },
};
