'use strict';

const got = require('got');

function selfRequest(app, {
  gotDefaults = {},
} = {}) {
  const gotClient = got.extend({
    retry: 0,
    timeout: 2000,
    followRedirect: false,
    throwHttpErrors: false,
    rejectUnauthorized: false,
    headers: {
      'user-agent': '@medley/self-request (https://github.com/medleyjs/self-request)',
    },
  }, gotDefaults);

  let urlOrigin = ''; // This can only be set once the server has started listening

  app.extend('request', async function request(url, options) {
    if (app.server === null || !app.server.listening) {
      await app.listen(0, 'localhost');
    }

    if (urlOrigin === '') {
      app.server.unref();
      urlOrigin = `${getProtocol(app.server)}//localhost:${app.server.address().port}`;
    }

    const baseUrl = urlOrigin + this.basePath;

    if (typeof url === 'string') {
      url = joinUrls(baseUrl, url);
    } else if (url && typeof url.url === 'string') {
      url = {...url, url: joinUrls(baseUrl, url.url)};
    } else {
      throw new TypeError('Missing `url` argument or option');
    }

    return gotClient(url, options);
  });
}

function getProtocol(server) {
  return server.constructor.name === 'Http2SecureServer' ||
    server instanceof require('https').Server
    ? 'https:'
    : 'http:';
}

function joinUrls(baseUrl, url) {
  return baseUrl[baseUrl.length - 1] === '/' && url !== '' && url[0] === '/'
    ? baseUrl + url.slice(1)
    : baseUrl + url;
}

module.exports = selfRequest;
