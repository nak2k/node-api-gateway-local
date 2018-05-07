const parallel = require('run-parallel');

/**
 * Get definitions of RestApi.
 *
 * @param {Object} APIGateway - An instance of the APIGateway class of aws-sdk.
 *
 * @param {String} restApiId - An identifier of the RestApi.
 *
 * @param {Function} callback(err, api) - A function that is called when a response from the APIGateway is returned.
 */
function getApiDefinition(APIGateway, restApiId, callback) {
  parallel([
    callback =>
      APIGateway.getRestApi({ restApiId }, callback),
    callback =>
      APIGateway.getResources({
        restApiId,
        limit: 500,
        embed: ['methods'],
      }, callback),
  ], (err, [restApi, resources]) => {
    if (err) {
      return callback(err, null);
    }

    restApi.resources = resources.items;

    callback(null, restApi);
  });
}

/*
 * Exports.
 */
exports.getApiDefinition = getApiDefinition;
