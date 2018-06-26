const { mkdirp } = require('hashed-tmp');
const application = require('./application');
const { startRepl } = require('./repl');
const waterfall = require('run-waterfall');
const { createServer } = require('http');

module.exports = run;

function run(options, callback) {
  waterfall([
    mkdirp.bind(null, {
      basedir: 'api-gateway-local',
      src: process.cwd(),
      length: 16,
    }),

    (tmpdir, callback) => {
      options = {
        tmpdir,
        ...options,
      };

      application(options, callback);
    },

    (app, callback) => {
      startRepl(app, options, (err, replServer) => {
        if (err) {
          return callback(err);
        }

        app.replServer = replServer;

        callback(null, app);
      });
    },

    (app, callback) => {
      const server = createServer(app);

      app.close = () => {
        server.close();
        app.replServer.close();
        app.close = undefined;
      };

      server.listen(options.port, 'localhost', function() {
        const { address, port } = this.address();
        console.log("Listening: http://%s:%s", address, port);

        /*
         * Notify update.
         */
        const updateNotifier = require('update-notifier');
        const pkg = require('../package.json');

        updateNotifier({pkg}).notify();
      });
    },
  ], callback);
}
