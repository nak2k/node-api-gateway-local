const waterfall = require('run-waterfall');
const {
  parseSwagger,
} = require('./parseSwagger');
const {
  ALLOWED_VALUES,
  ANY,
  BEGIN,
  CASE,
  DEFAULT,
  ELEMENT,
  END,
  IGNORED,
  REQUIRED,
  TYPE,
  TYPE_MISMATCH,
  TYPE_OF_DATA,
  UNKNOWN_ERROR,
  findErrors,
  logError,
} = require('cfn-parser');
const {
  ERR_MULTIPLE_APIS_NOT_SUPPORTED,
} = require('../../errors');
const {
  genId,
} = require('api-gateway-util');

/**
 * Parse an Api resource.
 */
exports['AWS::Serverless::Api'] = {
  Properties: {
    Name: {
      [TYPE]: String,
      [REQUIRED]: false,
    },

    StageName: {
      [TYPE]: String,
      [REQUIRED]: true,
    },

    DefinitionUri: {
      [CASE]: TYPE_OF_DATA,
      [REQUIRED]: false,

      string: {},

      object: {},

      [DEFAULT]: TYPE_MISMATCH,
    },

    DefinitionBody: {
      [TYPE]: Object,
      [REQUIRED]: false,
    },

    CacheClusterEnabled: {
      [TYPE]: Boolean,
      [REQUIRED]: false,
    },

    CacheClusterSize: {
      [TYPE]: String,
      [REQUIRED]: false,
    },

    Variables: {
      [TYPE]: Object,
      [REQUIRED]: false,
    },

    MethodSettings: {
      [TYPE]: Object,
      [REQUIRED]: false,
    },

    EndpointConfiguration: {
      [TYPE]: String,
      [REQUIRED]: false,
      [ALLOWED_VALUES]: [
        'EDGE',
        'REGIONAL',
      ],
    },

    BinaryMediaTypes: {
      [TYPE]: Array,
      [REQUIRED]: false,
      [ELEMENT]: String,
    },

    Cors: {
      [CASE]: TYPE_OF_DATA,
      [REQUIRED]: false,

      string: {},

      object: {
        AllowMethods: {
          [REQUIRED]: false,
        },

        AllowHeaders: {
          [REQUIRED]: false,
        },

        AllowOrigin: {
          [REQUIRED]: true,
        },

        MaxAge: {
          [REQUIRED]: false,
        },
      },

      [DEFAULT]: TYPE_MISMATCH,
    },

    [ANY]: UNKNOWN_ERROR,
  },

  [END]: (dataRef, context, callback) => {
    if (findErrors(dataRef.path, context).length) {
      return callback(null);
    }

    if (context.api) {
      logError(dataRef, context, ERR_MULTIPLE_APIS_NOT_SUPPORTED);
    }

    const resource = dataRef.data;

    const {
      DefinitionUri,
      DefinitionBody,
      Variables,
    } = resource.Properties;

    waterfall([
      callback => {
        /*
         * Parse DefinitionBody.
         */
        if (DefinitionBody !== undefined) {
          return callback(null, DefinitionBody);
        }

        /*
         * Parse DefinitionUri.
         */
        const type = typeof DefinitionUri;

        if (type === 'string') {
          logError(dataRef, context, Error, 'Not implemented yet.');
        } else if (type === 'object') {
          logError(dataRef, context, Error, 'Not implemented yet.');
        }

        callback(null);
      },

      (swagger, callback) => {
        parseSwagger(swagger, context, callback);
      },

      (api, callback) => {
        resource.PhysicalId = genId();

        context.api = api;

        callback(null);
      },
    ], callback);
  },
};
