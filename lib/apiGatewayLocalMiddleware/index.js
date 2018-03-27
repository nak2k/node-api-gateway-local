const { matchBy } = require('api-gateway-util');
const waterfall = require('run-waterfall');
const apiGatewayBodyParser = require('api-gateway-body-parser');

const { apiGatewayLogger } = require('./logger');
const { awsProxyIntegration } = require('./awsProxyIntegration');
const { awsIntegration } = require('./awsIntegration');
const { killAllLambas } = require('./lambdaManager');

const debug = require('debug')('api-gateway-local:middleware');

const apiGatewayLocalMiddleware = options => {
  const {
    restApiId,
    resources,
    binaryMediaTypes,
    lambdas,
  } = options;

  const bodyParserMiddleware = apiGatewayBodyParser({
    binaryMediaTypes,
    limit: '10mb',
  });

  const logger = apiGatewayLogger({});

  process.on('SIGINT', () => {
    logger.info('Kill all lambdas.');

    killAllLambas();

    logger.info('Ctrl+\\ to quit.');
  });

  process.on('SIGQUIT', () => {
    process.exit(0);
  });

  return (req, res, next) => {
    waterfall([
      bodyParserMiddleware.bind(null, req, res),

      matchBy.bind(null, resources, req),

      (result, callback) => {
        /*
         * Ignore a request matched no resources.
         */
        if (!result) {
          return next();
        }

        /*
         * Process by integration type.
         */
        const { type } = result.resourceMethod.methodIntegration;

        if (type === 'AWS_PROXY') {
          return awsProxyIntegration({
            restApiId,
            lambdas,
            logger,
          }, req, res, result, callback);
        } else if (type === 'AWS') {
          return awsIntegration({
            logger,
          }, req, res, result, callback);
        } else if (type === 'MOCK') {
          return callback(new Error(`Unsupported integration type ${type}`), null);
        } else {
          return callback(new Error(`Unsupported integration type ${type}`), null);
        }
      },
    ], err => {
      if (err) {
        return next(err);
      }

      res.end();
    });
  };
}

/*
 * Exports.
 */
exports.apiGatewayLocalMiddleware = apiGatewayLocalMiddleware;
