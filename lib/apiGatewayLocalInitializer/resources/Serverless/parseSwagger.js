const {
  ERR_SWAGGER_INVALID_VERSION,
  ERR_SWAGGER_NOT_OBJECT,
} = require('../../errors');
const {
  genId,
  getOrCreateResource,
} = require('api-gateway-util');

function parseSwagger(swagger, context, callback) {
  if (swagger.swagger !== 2 && swagger.swagger !== '2.0') {
    context.errors.push(ERR_SWAGGER_INVALID_VERSION());
  }

  const { paths } = swagger;

  if (typeof paths !== 'object') {
    context.errors.push(ERR_SWAGGER_NOT_OBJECT('paths'));
    return;
  }

  const resources = [];

  Object.entries(paths).forEach(([path, pathItem]) => {
    if (typeof pathItem !== 'object') {
      context.errors.push(ERR_SWAGGER_NOT_OBJECT(`paths.${path}`));
      return;
    }

    const resource = getOrCreateResource(resources, path);

    Object.entries(pathItem).forEach(([methodNameOnSwagger, operation]) => {
      if (typeof operation !== 'object') {
        context.errors.push(ERR_SWAGGER_NOT_OBJECT(`paths.${path}.${method}`));
        return;
      }

      const {
        produces = [],
        parameters = [],
        responses = {},
        'x-amazon-apigateway-integration': integration,
      } = operation;

      if (typeof integration !== 'object') {
        context.errors.push(ERR_SWAGGER_NOT_OBJECT(`paths.${path}.${method}.x-amazon-apigateway-integration`));
        return;
      }

      const methodName = (methodNameOnSwagger === 'x-amazon-apigateway-any-method')
        ? 'ANY'
        : methodNameOnSwagger.toUpperCase();

      const methodIntegration = {
        type: integration.type.toUpperCase(),
        httpMethod: integration.httpMethod,
        uri: integration.uri,
        passthroughBehavior: integration.passthroughBehavior,
        contentHandling: integration.contentHandling,
      };

      resource.resourceMethods[methodName] = {
        httpMethod: methodName,
        authorizationType: 'NONE',
        apiKeyRequired: false,
        requestParameters: {
        },
        methodIntegration,
      };
    });
  });

  const binaryMediaTypes = swagger['x-amazon-apigateway-binary-media-types'];

  callback(null, {
    restApiId: genId(),
    resources,
    binaryMediaTypes,
  });
}

/*
 * Exports.
 */
exports.parseSwagger = parseSwagger;
