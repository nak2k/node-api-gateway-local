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
    template,
  } = options;

  if (!restApiId && !template) {
    return next(new Error('Either options.restApiId or options.template must be specified'));
  }

  if (serveStatic) {
    const err = useServeStatic(app, configDir, serveStatic);

    if (err) {
      return next(err);
    }
  }

  if (!Array.isArray(options.lambdas)) {
    return next(new Error('options.lambdas must be an Array'));
  }

  const lambdas = options.lambdas
    .map(resolvePathInLambdaConf.bind(null, configDir));

  /*
   * The api is obtained from API Gateway, when the template is not specified.
   */
  const {
    cacheDir = `${configDir}/tmp/api-gateway-cache`,
  } = options;

  const {
    cacheFile = `${cacheDir}/${restApiId}.json`,
  } = options;

  getApiDefinitionWithCaching({
    APIGateway: app.APIGateway,
    restApiId,
    cacheFile,
  }, callbackForApi);

  /*
   * This callback is called, after an api is obtained.
   */
  function callbackForApi(err, api) {
    if (err) {
      return next(err);
    }

    app.use(apiGatewayLocalMiddleware({
      restApiId,
      lambdas,
      resources: api.resources,
      binaryMediaTypes: api.binaryMediaTypes,
    }));

    next();
  }
};

function getApiDefinitionWithCaching(options, callback) {
  const {
    APIGateway,
    restApiId,
    cacheFile,
  } = options;

  getApiDefinition(APIGateway, restApiId, (err, api) => {
    if (err) {
      if (!cacheFile) {
        return callback(err);
      }

      /*
       * Offline mode.
       */
      console.info('Offline mode');

      readJsonFile(cacheFile, (err, api) => {
        if (err) {
          return callback(err);
        }

        callback(null, api);
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

      callback(null, api);
    }
  });
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
