const { parseArn } = require('arn2');
const { invokeLambda } = require('./lambdaManager');

const debug = require('debug')('api-gateway-local:middleware');

/**
 * Handle a request that calls AWS proxy integration.
 *
 * @param {Object} options - A definition to invoke a lambda.
 *
 * @param {Object} req - A request object of Express.
 *
 * @param {Object} res - A response object of Express.
 *
 * @param {Object} result - A resource object that defines AWS proxy integration.
 *
 * @param {Function} callback(err, result) - A function that is called
 *   when a response is set to the argument res, or an error occurred.
 */
function awsProxyIntegration(options, req, res, result, callback) {
  extractDataToInvokeLambda(result, (err, result) => {
    if (err) {
      return callback(err);
    }

    invokeLambda(options, req, res, result, callback);
  });
}

/**
 * Extract data to invoke a lambda from a resource of API Gateway.
 *
 * @param {Object} result - A resource of API Gateway. It must defined a lambda integration.
 *
 * @param {Function} callback(err, result) - A function that is called to return extracted data.
 */
function extractDataToInvokeLambda(result, callback) {
  const {
    resource,
    pathParameters,
    resourceMethod,
  } = result;

  const { type, uri } = resourceMethod.methodIntegration;

  if (type !== 'AWS_PROXY') {
    return callback(new Error(`Unsupported integration type ${type}`), null);
  }

  if (!uri) {
    return callback(new Error(`Method integration has no uri`), null);
  }

  debug('Method integration uri %j', uri);

  const [err, arnObj] = parseArn(uri);

  if (err) {
    return callback(err);
  }

  const { apigateway } = arnObj;

  if (!apigateway) {
    return callback(new Error(`ARN #{uri} is not for API Gateway`), null);
  }

  const { lambdaIntegration } = apigateway;

  if (!lambdaIntegration || !lambdaIntegration.lambda) {
    return callback(new Error(`ARN #{uri} is not for Lambda integration`), null);
  }

  callback(null, {
    resource,
    pathParameters,
    lambdaIntegration,
  });
}

/*
 * Exports.
 */
exports.awsProxyIntegration = awsProxyIntegration;
