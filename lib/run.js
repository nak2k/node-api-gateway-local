const application = require('./application');

module.exports = run;

function run(options, callback) {
  application(options, (err, app) => {
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
}
