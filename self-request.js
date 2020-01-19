'use strict';

const got = require('got');

function getProtocol(server) {
  return server.constructor.name === 'Http2SecureServer' ||
    server instanceof require('https').Server
    ? 'https:'
    : 'http:';
}

function selfRequest(app, {
  basePath = app.basePath,
  gotDefaults,
} = {}) {
  const gotOptions = {
    retry: 0,
    timeout: 2000,
    followRedirect: false,
    throwHttpErrors: false,
    rejectUnauthorized: false,
    prefixUrl: '', // Gets set in request()
    ...gotDefaults,
  };

  let gotClient = null;

  app.extend('request', async function request(url, options) {
    if (app.server === null || !app.server.listening) {
      await app.listen(0, 'localhost');
    }

    if (gotClient === null) {
      app.server.unref();

      gotOptions.prefixUrl =
        getProtocol(app.server) + '//localhost:' + app.server.address().port + basePath;

      gotClient = got.extend(gotOptions);
    }

    // Ensure the url does not start with a '/'
    if (typeof url === 'object') { // url is options object
      const urlPath = url.url;
      if (typeof urlPath === 'string' && urlPath !== '' && urlPath[0] === '/') {
        url = {...url, url: urlPath.slice(1)};
      }
    } else if (typeof url === 'string' && url !== '' && url[0] === '/') {
      url = url.slice(1);
    }

    return gotClient(url, options);
  });
}

module.exports = selfRequest;
