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
    baseUrl: getProtocol(app.server) + '//localhost',
    ...gotDefaults,
  };

  let gotClient = null;

  app.decorate('request', function request(url, options) {
    if (!app.server.listening) {
      return app.listen(0, 'localhost').then(() => request(url, options));
    }

    if (gotClient === null) {
      app.server.unref();

      gotOptions.baseUrl += ':' + app.server.address().port + basePath;

      gotClient = got.extend(gotOptions);
    }

    return gotClient(url, options);
  });
}

selfRequest.meta = {
  name: '@medley/self-request',
};

module.exports = selfRequest;
