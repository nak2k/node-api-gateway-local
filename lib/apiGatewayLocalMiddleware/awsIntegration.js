const { makeHeadersFromRaw } = require('./util');
const { parseArn } = require('arn2');
const { makeSigner } = require('aws4-with-assume-role');
const { request } = require('https');
const { lazy } = require('task-waiter');

const debug = require('debug')('api-gateway-local:middleware');

const awsIntegration = options => {
  const {
    logger,
  } = options;

  const then = lazy(callback => makeSigner({}, callback));

  return (req, res, result, callback) => {
    const {
      resource,
      pathParameters,
      resourceMethod,
    } = result;

    // logger.info(JSON.stringify(result));

    const [err, reqOptions] = makeReqeust(result, req);

    if (err) {
      return callback(err);
    }

    logger.info(JSON.stringify(reqOptions));

    const {
      methodIntegration: {
        credentials,
      },
    } = resourceMethod;

    then((err, sign) => {
      if (err) {
        return callback(err);
      }

      const signedReqOptions = sign(reqOptions, {
        roleArn: credentials,
      }, (err, signedReqOptions) => {
        if (err) {
          return callback(err);
        }

        const awsReq = request(signedReqOptions, awsRes => {
          res.status(awsRes.statusCode);
          res.set(awsRes.headers);
          awsRes.pipe(res);
        });

        awsReq.on('error', callback);

        awsReq.end('');
      });
    });
  };
};

function makeReqeust(result, req) {
  const {
    pathParameters,
    resourceMethod,
  } = result;

  const {
    methodIntegration: {
      httpMethod,
      uri,
      requestParameters,
    },
  } = resourceMethod;

  const { headers, multiValueHeaders } = makeHeadersFromRaw(req.rawHeaders);

  const [err, integrationParameters] = evalParameters(requestParameters, {
    method: {
      request: {
        path: pathParameters,
        querystring: req.query,
        header,
        multiValueHeaders,
        body: req.body,
      },
    },
    stageVariables: {
    },
    context: {
    },
  });

  if (err) {
    return [err, null];
  }

  const [err2, arnObj] = parseArn(uri);

  if (err2) {
    return [err2, null];
  }

  const path = arnObj.resource
    .replace(/^path/, '')
    .replace(/{(\w+)}/g, (match, p1) => pathParameters[p1]);

  return [null, {
    method: httpMethod,
    service: arnObj.account,
    region: arnObj.region,
    path,
    signQuery: true,
  }];
}

function evalParameters(parameters, mappingContext) {
  const result = Object.create(null);
  const keys = Object.keys(parameters);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    const expr = parameters[key];
    const [err, value] = getByMappingExpression(expr, mappingContext);

    if (err) {
      return [err, null];
    }

    const err2 = setByMappingExpression(key, value, result);

    if (err2) {
      return [err2, null];
    }
  }

  return [null, result];
}

function getByMappingExpression(expr, mappingContext) {
  if (expr.startsWith("'") && expr.endsWith("'")) {
    return [null, expr.slice(1, -1)];
  }

  if (expr.startsWith('method.request.body.')) {
    return [new Error(`A expr of method.request.body.JSONPath_EXPRESSION is unsupported yet : Expr ${expr}`), null];
  }

  const result = expr.split('.').reduce((result, factor) => {
    if (typeof result !== 'object') {
      return result;
    }

    return result[factor];
  }, mappingContext);

  return [null, result];
}

function setByMappingExpression(expr, value, result) {
  const factors = expr.split('.');
  const lastIndex = factors.length - 1;

  let context = result;
  for (let i = 0; i < lastIndex; i++) {
    const factor = factors[i];
    const nextContext = context[factor];

    if (nextContext === undefined) {
      context = context[factor] = Object.create(null);
    } else if (typeof(nextContext) !== 'object') {
      const expr = factors.slice(0, i + 1).join('.');
      return new Error(`${expr} isn't an object`);
    } else {
      context = nextContext;
    }
  }

  context[factors[lastIndex]] = value;

  return null;
}

/*
 * Exports.
 */
exports.awsIntegration = awsIntegration;
