const {
  INIT_RESULT,
  spawnLambda,
} = require('lambda-spawn');
const { lambdaLogger } = require('./logger');
const { reqToEvent, setResFromResult } = require('./util');
const debug = require('debug')('api-gateway-local:middleware');

const lambdaProcesses = {};

function killAllLambas() {
  Object.values(lambdaProcesses).forEach(p => p.kill());
}

function invokeLambda(options, req, res, result, callback) {
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
  } = result.lambdaIntegration;

  debug('Target lambda %s', arn);

  const lambda = lambdas.find(item => item.name === functionName);

  if (!lambda) {
    return callback(new Error(`Lambda ${functionName} not defined`), null);
  }

  debug('Lambda %j', lambda);

  const spawnOptions = Object.assign({
    arn,
    region,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      AWS_SAM_LOCAL: 'true',
      ...process.env,
    },
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

  const lambdaProcess = lambdaProcesses[arn];

  if (lambdaProcess) {
    return invoke(lambdaProcess);
  } else {
    return createLambdaProcess();
  }

  function createLambdaProcess() {
    logger.info('Start lambda process.');

    const lambdaProcess = spawnLambda(spawnOptions);
    lambdaProcesses[arn] = lambdaProcess;

    const { lambdaStdout, lambdaStderr } = lambdaLogger({});

    lambdaProcess.stdout.pipe(lambdaStdout);
    lambdaProcess.stderr.pipe(lambdaStderr);

    lambdaProcess.on(INIT_RESULT, ({ err }) => {
      if (err) {
        return callback(err);
      }

      invoke(lambdaProcess);
    });

    lambdaProcess.on('exit', (code, signal) => {
      delete lambdaProcesses[arn];
    });
  }

  function invoke(lambdaProcess) {
    logger.dir(event);

    lambdaProcess.invoke(event, context, (err, result) => {
      /*
       * Process a result returning from the lambda.
       */
      logger.info('Received result from lambda process.');
      logger.dir(result);

      if (err) {
        if (err.code === 'ERR_IPC_CHANNEL_CLOSED') {
          return createLambdaProcess();
        }

        return callback(err);
      }

      setResFromResult(res, result, callback);
    });
  }
}

/*
 * Exports.
 */
exports.invokeLambda = invokeLambda;
exports.killAllLambas = killAllLambas;
