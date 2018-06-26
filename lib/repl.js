const net = require('net');
const repl = require('repl');
const { unlink } = require('fs');

function startRepl(app, options, callback) {
  const {
    tmpdir,
  } = options;

  const socketPath = `${tmpdir}/repl-sock`;

  net.createServer(socket => {
    socket.on('error', err => {
      if (err.code === 'EPIPE') {
        // Ignore
        return;
      }

      console.error(err);
    });

    const r = repl.start('api-gateway-local> ', socket);

    r.context.stopServer = function () {
    };
  }).listen(socketPath, function() {
    process.on('SIGINT', () => {
      this.close();
      process.exit(0);
    });

    callback(null);
  }).on('error', err => {
    if (err.code !== 'EADDRINUSE') {
      return callback(err);
    }

    /*
     * Check that a server is started already.
     */
    net.connect(socketPath, function() {
      this.close();

      return callback(new Error('api-gateway-local is started already.'));
    }).on('error', err => {
      if (err.code !== 'ECONNREFUSED') {
        return callback(err);
      }

      /*
       * Remove the socket file if the server is dead.
       */
      unlink(socketPath, err => {
        if (err) {
          return callback(err);
        }

        return startRepl(app, options, callback);
      });
    });
  });
}

/*
 * Exports.
 */
exports.startRepl = startRepl;
