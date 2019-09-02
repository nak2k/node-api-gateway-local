const net = require('net');
const repl = require('repl');
const { unlink } = require('fs');
const { killAllLambas } = require('./apiGatewayLocalMiddleware/lambdaManager');
const { tmpdir } = require('hashed-tmp');

function startRepl(app, options, callback) {
  const {
    tmpdir,
  } = options;

  const socketPath = `${tmpdir}/repl-sock`;

  const replServer = net.createServer(socket => {
    socket.on('error', err => {
      if (err.code === 'EPIPE') {
        // Ignore
        return;
      }

      console.error(err);
    });

    const r = repl.start('api-gateway-local> ', socket);
    configureRepl(r, app, options);
  }).on('error', err => {
    if (err.code !== 'EADDRINUSE') {
      return callback(err);
    }

    /*
     * Check that a server is started already.
     */
    net.connect(socketPath, function() {
      this.destroy();

      return callback(new Error(`api-gateway-local is started already. socketPath: ${socketPath}`));
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

  replServer.listen(socketPath, function() {
    process.on('SIGINT', () => {
      this.close();
      process.exit(0);
    });

    callback(null, replServer);
  });
}

function configureRepl(r, app, options) {
  Object.assign(r.context, {
    browse() {
      const opn = require('opn');
      opn(app.endpoint);
      return true;
    },

    restartLambda() {
      killAllLambas();
      return true;
    },

    stopServer() {
      app.close();
      return true;
    },
  });
}

function runShell(cmdline, callback) {
  const tmp = tmpdir({
    basedir: 'api-gateway-local',
    src: process.cwd(),
    length: 16,
  });

  const socketPath = `${tmp}/repl-sock`;

  net.connect(socketPath, function() {
    this.pipe(process.stdout);

    if (cmdline.length === 0) {
      process.stdin.pipe(this);
    } else {
      this.end(cmdline + '\n');
    }
  }).on('error', err => {
    if (err.code === 'ENOENT') {
      return callback(new Error('api-gateway-local is not started.'));
    }

    callback(err);
  });
}

/*
 * Exports.
 */
exports.startRepl = startRepl;
exports.runShell = runShell;
