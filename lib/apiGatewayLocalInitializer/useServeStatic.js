const { resolve } = require('path');
const serveStatic = require('serve-static');

function useServeStatic(app, baseDir, routes, callback) {
  if (!Array.isArray(routes)) {
    return callback(new Error('routes must be an Array'));
  }

  for (let i = 0; i < routes.length; ++i) {
    const routeObj = routes[i];

    if (typeof(routeObj) !== 'object') {
      return callback(new Error('All elements of routes must be an object'));
    }

    [].concat(routeObj.route).forEach(route =>
      [].concat(routeObj.dir).forEach(dir =>
        app.use(route, serveStatic(resolve(baseDir, dir)))));
  }

  callback(null);
}

/*
 * Exports.
 */
exports.useServeStatic = useServeStatic;
