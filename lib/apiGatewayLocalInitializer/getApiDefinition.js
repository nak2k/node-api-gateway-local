const parallel = require('run-parallel');

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
