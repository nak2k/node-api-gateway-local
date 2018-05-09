const { apiGatewayLocalMiddleware } = require('../apiGatewayLocalMiddleware');
const readJsonFile = require('read-json');
const writeJsonFile = require('write-json');
const { resolve } = require('path');
const waterfall = require('run-waterfall');
const { useServeStatic } = require('./useServeStatic');
const { getApiDefinition } = require('./getApiDefinition');

const apiGatewayLocalInitializer = (options = {}) => app => next => {
  const {
    restApiId,
    template,
  } = options;

  if (!restApiId && !template) {
    return next(new Error('Either options.restApiId or options.template must be specified'));
  }

  const {
    configDir,
    serveStatic,
  } = options;

  waterfall([
    callback => serveStatic
      ? useServeStatic(app, configDir, serveStatic, callback)
      : callback(null),

    callback => getApiDefinitionWithCaching(app, options, callback),

    (middlewareOptions, callback) => {
      app.use(apiGatewayLocalMiddleware(middlewareOptions));
      callback(null);
    },
  ], next);
};

/*
 * The api is obtained from API Gateway, when the template is not specified.
 */
function getApiDefinitionWithCaching(app, options, callback) {
  if (!Array.isArray(options.lambdas)) {
    return callback(new Error('options.lambdas must be an Array'));
  }

  const { configDir, restApiId } = options;
  const { cacheDir = `${configDir}/tmp/api-gateway-cache` } = options;
  const { cacheFile = `${cacheDir}/${restApiId}.json` } = options;

  const lambdas = options.lambdas
    .map(resolvePathInLambdaConf.bind(null, configDir));

  waterfall([
    callback => getApiDefinition(app.APIGateway, restApiId, (err, api) => {
      if (err) {
        if (!cacheFile) {
          return callback(err);
        }

        console.info(`Load API definitions from the cache file '${cacheFile}'`);

        readJsonFile(cacheFile, callback);
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

        callback(null, api);
      }
    }),

    (api, callback) => {
      callback(null, {
        restApiId,
        lambdas,
        resources: api.resources,
        binaryMediaTypes: api.binaryMediaTypes,
      });
    },
  ], callback);
}

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
