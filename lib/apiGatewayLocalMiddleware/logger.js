const split = require('split');
const { red, cyan, green } = require('chalk');
const { format } = require('util');
const { get } = require('caseless-get');
const typeis = require('type-is');

const logMapper = options => line => {
  if (!line) {
    return;
  }

  const {
    label,
    limit = 4096,
  } = options;

  const timestamp = (new Date()).toLocaleTimeString();

  if (limit && line.length > limit) {
    line = line.substr(0, limit) + '\n' + red('*** truncated ***');
    return `[${label}] ${timestamp} ${line}\n`;
  }

  let json;

  try {
    json = JSON.parse(line);
  } catch (err) {
    // Ignore parsing error.
    return `[${label}] ${timestamp} ${line}\n`;
  }

  if (typeof json === 'object' && json !== null && json.headers) {
    const contentType = get(json.headers, 'content-type');

    if (typeis.is(contentType, ['application/json'])) {
      try {
        json.body = JSON.parse(json.body);
      } catch (err) {
        // Ignore parsing error.
      }
    }
  }

  line = JSON.stringify(json, null, 2);

  return `[${label}] ${timestamp} ${line}\n`;
};

const apiGatewayLogger = options => {
  const apiGatewayStdout = split(logMapper({
    label: green('ApiGateway:INFO'),
    limit: options.limit,
  }));

  apiGatewayStdout.pipe(process.stdout);

  const apiGatewayStderr = split(logMapper({
    label: red('ApiGateway:ERROR'),
    limit: options.limit,
  }));

  apiGatewayStderr.pipe(process.stderr);

  return {
    apiGatewayStdout,
    apiGatewayStderr,
    log(...args) {
      apiGatewayStdout.write(format(...args) + '\n');
    },
    info(...args) {
      apiGatewayStdout.write(format(...args) + '\n');
    },
    dir(obj) {
      apiGatewayStdout.write(JSON.stringify(obj) + '\n');
    },
  };
};

const lambdaLogger = options => {
  const lambdaStdout = split(logMapper({
    label: cyan('Lambda:INFO'),
    limit: options.limit,
  }));

  lambdaStdout.pipe(process.stdout);

  const lambdaStderr = split(logMapper({
    label: red('Lambda:ERROR'),
    limit: options.limit,
  }));

  lambdaStderr.pipe(process.stderr);

  return {
    lambdaStdout,
    lambdaStderr,
  };
};

/*
 * Exports.
 */
exports.apiGatewayLogger = apiGatewayLogger;
exports.lambdaLogger = lambdaLogger;
