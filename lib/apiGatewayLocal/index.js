const debug = require('debug')('apiGatewayLocal');
const { middleware } = require('./middleware');
const { writeJsonFile, readJsonFile } = require('../jsonfs');
const { text } = require('body-parser');

const apiGatewayLocal = (options = {}) => app => next => {
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

    app.use(text({
      limit: '10mb',
      type: '*/*',
    }));

    app.use(middleware({
      restApiId,
      configDir,
      lambdas,
      resources,
    }));

    next();
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
      writeJsonFile(cacheFile, data.items, err => {
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

exports.apiGatewayLocal = apiGatewayLocal;
