export function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
}

export function getProxyAgent() {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return undefined;
  
  const url = new URL(proxyUrl);
  if (url.protocol === 'https:') {
    const { HttpsProxyAgent } = require('https-proxy-agent');
    return new HttpsProxyAgent(proxyUrl);
  } else {
    const { HttpProxyAgent } = require('http-proxy-agent');
    return new HttpProxyAgent(proxyUrl);
  }
}
