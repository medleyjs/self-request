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
    retries: 0,
    followRedirect: false,
    throwHttpErrors: false,
    baseUrl: getProtocol(app.server) + '//localhost',
    ...gotDefaults,
  };

  let gotClient = null;

  app.decorate('request', function request(path, options) {
    if (!app.server.listening) {
      return app.listen(0, 'localhost').then(() => request(path, options));
    }

    if (gotClient === null) {
      app.server.unref();

      gotOptions.baseUrl += ':' + app.server.address().port + basePath;

      gotClient = got.extend(gotOptions);
    }

    if (typeof path === 'object' && path.path !== undefined) {
      options = path;
      path = options.path;
    }

    return gotClient(path, options);
  });
}

selfRequest.meta = {
  name: '@medley/self-request',
};

module.exports = selfRequest;
