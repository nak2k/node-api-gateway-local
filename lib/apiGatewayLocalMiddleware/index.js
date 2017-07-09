const { matchByReq } = require('api-gateway-util');
const { parseArn } = require('arn2');
const waterfall = require('run-waterfall');
const { spawnLambda } = require('lambda-spawn');
const { resolve } = require('path');
const apiGatewayBodyParser = require('api-gateway-body-parser');

const { apiGatewayLogger, lambdaLogger } = require('./logger');
const { reqToEvent, setResFromResult } = require('./util');

const debug = require('debug')('api-gateway-local:middleware');

const apiGatewayLocalMiddleware = options => {
  const {
    restApiId,
    configDir,
    resources,
    binaryMediaTypes,
  } = options;

  let {
    lambdas,
  } = options;

  lambdas = lambdas.map(resolvePathInLambdaConf.bind(null, configDir));

  const bodyParserMiddleware = apiGatewayBodyParser({
    binaryMediaTypes,
    limit: '10mb',
  });

  const logger = apiGatewayLogger({});

  return (req, res, next) => {
    waterfall([
      bodyParserMiddleware.bind(null, req, res),

      matchByReq.bind(null, resources, req),

      /*
       * Ignore a request matched no resources.
       */
      (result, callback) => {
        if (!result) {
          return next();
        }

        callback(null, result);
      },

      extractDataToInvokeLambda,

      invokeLambda.bind(null, {
        restApiId,
        lambdas,
        logger,
      }, req),

      /*
       * Process a result returning from the lambda.
       */
      (result, callback) => {
        logger.info('Received result from lambda process.');
        logger.dir(result);

        setResFromResult(res, result, callback);
      },
    ], err => {
      if (err) {
        return next(err);
      }

      res.end();
    });
  };
}

function extractDataToInvokeLambda(result, callback) {
  const {
    resource,
    pathParameters,
    resourceMethod,
  } = result;

  const { type, uri } = resourceMethod.methodIntegration;

  if (!uri) {
    return callback(new Error(`Method integration has no uri`), null);
  }

  if (type !== 'AWS_PROXY') {
    return callback(new Error(`Unsupported integration type ${type}`), null);
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

  const { lambdaIntegation } = apigateway;

  if (!lambdaIntegation || !lambdaIntegation.lambda) {
    return callback(new Error(`ARN #{uri} is not for Lambda integration`), null);
  }

  callback(null, {
    resource,
    pathParameters,
    lambdaIntegation,
  });
}

function invokeLambda(options, req, result, callback) {
  const {
    restApiId,
    lambdas,
    logger,
  } = options;

  const {
    arn,
    region,
    lambda: {
      functionName,
      version,
    },
  } = result.lambdaIntegation;

  debug('Target lambda %s', arn);

  const lambda = lambdas.find(item => item.name === functionName);

  if (!lambda) {
    return callback(new Error(`Lambda ${functionName} not defined`), null);
  }

  debug('Lambda %j', lambda);

  const spawnOptions = Object.assign({
    region,
    stdio: ['ignore', 'pipe', 'pipe'],
  }, lambda);

  debug('spawnOptions %j', spawnOptions);

  const event = Object.assign(reqToEvent(req), {
    resource: result.resource.path,
    pathParameters: result.pathParameters,
    stageVariables: null,
    requestContext: {
      path: result.resource.path,
      accountId: '',
      resourceId: result.resource.id,
      stage: '',
      requestId: '',
      identity: {
        cognitoIdentityPoolId: null,
        accountId: '',
        cognitoIdentityId: null,
        caller: '',
        apiKey: '',
        sourceIp: '',
        accessKey: '',
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: '',
        userAgent: '',
        user: '',
      },
      resourcePath: result.resource.path,
      httpMethod: '',
      apiId: restApiId,
    },
  });

  const context = {
  };

  logger.info('Start lambda process.');
  logger.dir(event);

  const lambdaProcess = spawnLambda(spawnOptions, event, context, callback);

  const { lambdaStdout, lambdaStderr } = lambdaLogger({});

  lambdaProcess.stdout.pipe(lambdaStdout);
  lambdaProcess.stderr.pipe(lambdaStderr);
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
exports.apiGatewayLocalMiddleware = apiGatewayLocalMiddleware;
