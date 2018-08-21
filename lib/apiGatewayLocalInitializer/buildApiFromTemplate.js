const { readTemplate } = require('cfn-read-template');
const waterfall = require('run-waterfall');
const {
  DEBUG,
  makeTemplateParser,
} = require('cfn-parser');
const resourceTypeParsers = require('./resources');
const { dirname, resolve } = require('path');
const {
  ERR_API_NOT_DEFINED,
  ERR_MULTIPLE_APIS_NOT_SUPPORTED,
} = require('./errors');
const {
  genId,
  getOrCreateResource,
} = require('api-gateway-util');

/**
 * @param {String} options.template - A path of SAM template file.
 *
 * @param {Function} callback(err, middlewareOptions) - A function that is called
 *   to return an options to use apiGatewayLocalMiddleware.
 */
function buildApiFromTemplate(options, callback) {
  const templateParserOptions = {
    anyResourceTypeParser(dataRef, context, callback) {
      console.error(`Ignore ${dataRef.path}.`);
      callback(null);
    },
    resourceTypeParsers,
  };

  if (options.verbose) {
    templateParserOptions.schemaMap = {
      [DEBUG]: (dataRef, context, callback) => {
        console.dir(dataRef, { depth: null });
        callback(null);
      },
    };
  }

  const {
    logger = options.verbose && console,
  } = options;

  const templateParser = makeTemplateParser(templateParserOptions);

  waterfall([
    readTemplate.bind(null, options.template),

    (template, callback) => {
      const Parameters = {
        'AWS::AccountId': {
          Value: '123456789012',
        },
        'AWS::NotificationARNs': {
          Value: [],
        },
        'AWS::Partition': {
          Value: 'aws',
        },
        'AWS::Region': {
          Value: options.region,
        },
        'AWS::StackName': {
          Value: options.stackName || genId(),
        },
        'AWS::URLSuffix': {
          Value: 'amazonaws.com',
        },
      };

      if (options.Parameters !== undefined) {
        Object.assign(Parameters, options.Parameters);
      }

      if (logger) {
        logger.log('### parameters');
        logger.dir(Parameters, { depth: null });
      }

      templateParser(template, {
        api: undefined,
        lambdas: {},
        logger,
        Parameters,
        Resources: {
          ...(options.Resources || {}),
        },
        templateDir: dirname(resolve(options.template)),
      }, callback);
    },

    /*
     * Build middlewareOptions.
     */
    (context, callback) => {
      const {
        lambdas,
      } = context;

      if (logger) {
        logger.log('### resources');
        logger.dir(context.Resources, { depth: null });
      }

      const { api } = context;

      if (!api) {
        return callback(ERR_API_NOT_DEFINED());
      }

      if (logger) {
        logger.log('### api');
        logger.dir(api, { depth: null });
        logger.log('### lambdas');
        logger.dir(lambdas, { depth: null });
      }

      callback(null, {
        restApiId: api.restApiId,
        resources: api.resources,
        binaryMediaTypes: api.binaryMediaTypes,
        lambdas,
      });
    },
  ], callback);
}

/*
 * Exports.
 */
exports.buildApiFromTemplate = buildApiFromTemplate;
