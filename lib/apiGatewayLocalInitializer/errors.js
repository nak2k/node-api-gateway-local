let util;
let chalk;

function E(code, message) {
  exports[code] = (...args) => {
    util || (util = require('util'));
    chalk || (chalk = require('chalk'));

    args = args.map(arg => chalk.green(arg));

    const err = new Error(util.format(message, ...args));
    err.code = code;

    return err;
  };
}

E('ERR_API_NOT_DEFINED', 'Api not defined.');
E('ERR_MULTIPLE_APIS_NOT_SUPPORTED', 'Multiple APIs not supported.');
E('ERR_SERVERLESS_FUNCTION_DUPLICATED', 'Duplicated function %s.');
E('ERR_SWAGGER_INVALID_VERSION', 'Invalid swagger version.');
E('ERR_SWAGGER_NOT_OBJECT', '%s of Swagger document must be an object.');
