const { resolve } = require('path');
const serveStatic = require('serve-static');

function useServeStatic(app, baseDir, routes) {
  if (!Array.isArray(routes)) {
    return new Error('routes must be an Array');
  }

  for (let i = 0; i < routes.length; ++i) {
    const routeObj = routes[i];

    if (typeof(routeObj) !== 'object') {
      return new Error('All elements of routes must be an object');
    }

    [].concat(routeObj.route).forEach(route =>
      [].concat(routeObj.dir).forEach(dir =>
        app.use(route, serveStatic(resolve(baseDir, dir)))));
  }

  return null;
}

/*
 * Exports.
 */
exports.useServeStatic = useServeStatic;
