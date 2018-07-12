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
        implicitApiEvents: [],
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
        implicitApiEvents,
        lambdas,
      } = context;

      if (logger) {
        logger.log('### resources');
        logger.dir(context.Resources, { depth: null });
      }

      let { api } = context;

      if (api) {
        if (implicitApiEvents.length > 0) {
          return callback(ERR_MULTIPLE_APIS_NOT_SUPPORTED());
        }
      } else {
        if (implicitApiEvents.length === 0) {
          return callback(ERR_API_NOT_DEFINED());
        }

        api = makeImplicitApi(context);
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

function makeImplicitApi(context) {
  const resources = [];
  const binaryMediaTypes = [];

  context.implicitApiEvents.forEach(({ functionName, event }) => {
    const {
      Path,
      Method,
    } = event.Properties;

    const lambda = context.lambdas[functionName];

    const resource = getOrCreateResource(resources, Path);

    const {
      'AWS::Region': {
        Value: Region,
      },
    } = context.Parameters;

    const methodIntegration = {
      type: 'AWS_PROXY',
      httpMethod: 'POST',
      uri: `arn:aws:apigateway:${Region}:lambda:path/2015-03-31/functions/${lambda.arn}/invocations`,
      passthroughBehavior: '',
      contentHandling: '',
    };

    const methodName = Method.toUpperCase();

    resource.resourceMethods[methodName] = {
      httpMethod: methodName,
      authorizationType: 'NONE',
      apiKeyRequired: false,
      requestParameters: {
      },
      methodIntegration,
    };
  });

  return {
    restApiId: '_implicit',
    resources,
    binaryMediaTypes,
  };
}

/*
 * Exports.
 */
exports.buildApiFromTemplate = buildApiFromTemplate;
