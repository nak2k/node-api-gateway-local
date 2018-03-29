const { apiGatewayLocalMiddleware } = require('../apiGatewayLocalMiddleware');
const readJsonFile = require('read-json');
const writeJsonFile = require('write-json');
const { resolve } = require('path');
const debug = require('debug')('api-gateway-local:initializer');
const serveStatic = require('serve-static');

const apiGatewayLocalInitializer = (options = {}) => app => next => {
  const {
    restApiId,
    configDir,
    serveStatic,
  } = options;

  if (!restApiId) {
    return next(new Error('restApiId must be specified'));
  }

  if (serveStatic) {
    const err = useServeStatic(app, configDir, serveStatic);

    if (err) {
      return next(err);
    }
  }

  const lambdas = options.lambdas
    .map(resolvePathInLambdaConf.bind(null, configDir));

  const {
    cacheDir = `${configDir}/tmp/api-gateway-cache`,
  } = options;

  const {
    cacheFile = `${cacheDir}/${restApiId}.json`,
  } = options;

  getResources(app.APIGateway, restApiId, cacheFile, (err, resources) => {
    if (err) {
      return next(err);
    }

    app.APIGateway.getRestApi({ restApiId }, (err, data) => {
      if (err) {
        return next(err);
      }

      const { binaryMediaTypes } = data;

      app.use(apiGatewayLocalMiddleware({
        restApiId,
        configDir,
        lambdas,
        resources,
        binaryMediaTypes,
      }));

      next();
    });
  });
};

function resolvePathInLambdaConf(cwd, lambda) {
  lambda = Object.assign({}, lambda);

  lambda.dir = resolve(cwd, lambda.dir);
  lambda.moduleDir = lambda.moduleDir && resolve(cwd, lambda.moduleDir);
  lambda.additionalNodePath = lambda.additionalNodePath &&
    lambda.additionalNodePath.split(':').map(p => resolve(cwd, p)).join(':');

  return lambda;
}

function getResources(APIGateway, restApiId, cacheFile, callback) {
  const params = {
    restApiId,
    limit: 500,
    embed: ['methods'],
  };

  APIGateway.getResources(params, (err, data) => {
    if (err) {
      if (err.code !== 'UnknownEndpoint') {
        return callback(err, null);
      }

      if (!cacheFile) {
        return callback(new Error('Offline error'), null);
      }

      /*
       * Offline mode.
       */
      console.info('Offline mode');

      readJsonFile(cacheFile, callback);
      return;
    }

    if (cacheFile) {
      writeJsonFile(cacheFile, data.items, null, 2, err => {
        if (err) {
          /*
           * Warn only. Ignore the error.
           */
          console.warn(err);
        }
      });
    }

    callback(null, data.items);
  });
}

function useServeStatic(app, configDir, routes) {
  if (!Array.isArray(routes)) {
    return new Error('routes must be an Array');
  }

  for (let i = 0; i < routes.length; ++i) {
    const routeObj = routes[i];

    if (typeof(routeObj) !== 'object') {
      return new Error('All elements of routes must be an object');
    }

    [].concat(routeObj.route).forEach(route =>
      [].concat(routeObj.dir).forEach(dir =>
        app.use(route, serveStatic(resolve(configDir, dir)))));
  }

  return null;
}

/*
 * Exports.
 */
exports.apiGatewayLocalInitializer = apiGatewayLocalInitializer;
