const { apiGatewayLocalMiddleware } = require('./apiGatewayLocalMiddleware');
const readJsonFile = require('read-json');
const writeJsonFile = require('write-json');
const debug = require('debug')('api-gateway-local:initializer');

const apiGatewayLocalInitializer = (options = {}) => app => next => {
  const {
    restApiId,
    configDir,
    lambdas,
  } = options;

  if (!restApiId) {
    return next(new Error('restApiId must be specified'));
  }

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

/*
 * Exports.
 */
exports.apiGatewayLocalInitializer = apiGatewayLocalInitializer;
