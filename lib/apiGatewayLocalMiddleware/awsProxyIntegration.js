const { parseArn } = require('arn2');
const { invokeLambda } = require('./lambdaManager');

const debug = require('debug')('api-gateway-local:middleware');

function awsProxyIntegration(options, req, res, result, callback) {
  extractDataToInvokeLambda(result, (err, result) => {
    if (err) {
      return callback(err);
    }

    invokeLambda(options, req, res, result, callback);
  });
}

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
