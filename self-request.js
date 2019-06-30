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
    baseUrl: '', // Gets set in request()
    ...gotDefaults,
  };

  let gotClient = null;

  app.decorate('request', async function request(url, options) {
    if (app.server === null || !app.server.listening) {
      await app.listen(0, 'localhost');
    }

    if (gotClient === null) {
      app.server.unref();

      gotOptions.baseUrl =
        getProtocol(app.server) + '//localhost:' + app.server.address().port + basePath;

      gotClient = got.extend(gotOptions);
    }

    return gotClient(url, options);
  });
}

module.exports = selfRequest;
