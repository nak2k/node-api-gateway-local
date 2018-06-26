const { mkdirp } = require('hashed-tmp');
const application = require('./application');
const { startRepl } = require('./repl');

module.exports = run;

function run(options, callback) {
  mkdirp({
    basedir: 'api-gateway-local',
    src: process.cwd(),
    length: 16,
  }, (err, tmpdir) => {
    if (err) {
      return callback(err);
    }

    options = {
      tmpdir,
      ...options,
    };

    application(options, (err, app) => {
      if (err) {
        return callback(err);
      }

      startRepl(app, options, err => {
        if (err) {
          return callback(err);
        }

        app.listen(options.port, 'localhost', function() {
          const { address, port } = this.address();
          console.log("Listening: http://%s:%s", address, port);

          /*
           * Notify update.
           */
          const updateNotifier = require('update-notifier');
          const pkg = require('../package.json');

          updateNotifier({pkg}).notify();
        });
      });
    });
  });
}
