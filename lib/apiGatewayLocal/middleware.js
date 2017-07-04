const { matchByReq } = require('api-gateway-util');
const { parseArn } = require('arn2');
const waterfall = require('run-waterfall');
const { spawnLambda } = require('lambda-spawn');
const { join } = require('path');
const { reqToEvent, setResFromResult } = require('./util');

const debug = require('debug')('apiGatewayLocal:middleware');

const middleware = options => {
  const {
    restApiId,
    configDir,
    lambdas,
    resources,
  } = options;

  return (req, res, next) => {
    waterfall([
      matchByReq.bind(null, resources, req),

      /*
       * Add result.methodIntegrationArnObj
       */
      (result, callback) => {
        if (!result) {
          return next();
        }

        const { resourceMethod } = result;
        const { type, uri } = resourceMethod.methodIntegration;

        /*
         * Ignore method integrations not supported.
         */
        if (type !== 'AWS_PROXY' || !uri) {
          debug('Ignore integration type %s uri %j', type, uri);

          return next();
        }

        debug('Method integration uri %j', uri);

        parseArn(uri, (err, arnObj) => {
          if (err) {
            return callback(err);
          }

          result.methodIntegrationArnObj = arnObj;

          callback(null, result);
        });
      },

      /*
       * Get a lambda integration from arnObj.
       */
      (result, callback) => {
        const { apigateway } = result.methodIntegrationArnObj;

        if (!apigateway) {
          return callback(new Error(`ARN #{uri} is not for API Gateway`), null);
        }

        const { lambdaIntegation } = apigateway;

        if (!lambdaIntegation || !lambdaIntegation.lambda) {
          return callback(new Error(`ARN #{uri} is not for Lambda integration`), null);
        }

        result.lambdaIntegationArnObj = lambdaIntegation;

        callback(null, result);
      },

      /*
       * Invoke a lambda.
       */
      (result, callback) => {
        const {
          arn,
          region,
          lambda: {
            functionName,
            version,
          },
        } = result.lambdaIntegationArnObj;

        debug('Target lambda %s', arn);

        const lambda = lambdas.find(item => item.name === functionName);

        if (!lambda) {
          return callback(new Error(`Lambda ${functionName} not defined`), null);
        }

        debug('Lambda %j', lambda);

        const spawnOptions = {
          dir: join(configDir, lambda.dir),
          handler: lambda.handler,
          region,
          command: lambda.command,
          moduleDir: lambda.moduleDir && join(configDir, lambda.moduleDir),
          env: lambda.env,
          lambdaEnv: lambda.lambdaEnv,
          babel: lambda.babel,
        };

        const event = Object.assign(reqToEvent(req), {
          resource: result.resource.path,
          pathParameters: result.pathParameters,
          stageVariables: null,
          isBase64Encoded: false,
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

        spawnLambda(spawnOptions, event, context, callback);
      },

      /*
       * Process a result returning from the lambda.
       */
      setResFromResult.bind(null, res),
    ], err => {
      if (err) {
        return next(err);
      }

      res.end();
    });
  };
}

exports.middleware = middleware;
