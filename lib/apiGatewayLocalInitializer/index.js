const { apiGatewayLocalMiddleware } = require('../apiGatewayLocalMiddleware');
const readJsonFile = require('read-json');
const writeJsonFile = require('write-json');
const { resolve } = require('path');
const debug = require('debug')('api-gateway-local:initializer');
const { useServeStatic } = require('./useServeStatic');
const { getApiDefinition } = require('./getApiDefinition');

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

  getApiDefinition(app.APIGateway, restApiId, (err, api) => {
    if (err) {
      if (!cacheFile) {
        return next(err);
      }

      /*
       * Offline mode.
       */
      console.info('Offline mode');

      readJsonFile(cacheFile, (err, api) => {
        if (err) {
          return next(err);
        }

        useApi(api);
      });
    } else {
      if (cacheFile) {
        writeJsonFile(cacheFile, api, null, 2, err => {
          if (err) {
            /*
             * Warn only. Ignore the error.
             */
            console.warn(err);
          }
        });
      }

      useApi(api);
    }

    function useApi(api) {
      app.use(apiGatewayLocalMiddleware({
        restApiId,
        configDir,
        lambdas,
        resources: api.resources,
        binaryMediaTypes: api.binaryMediaTypes,
      }));

      next();
    }
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

/*
 * Exports.
 */
exports.apiGatewayLocalInitializer = apiGatewayLocalInitializer;
