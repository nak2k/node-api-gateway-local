const { runShell } = require('../repl');
const { showError } = require('../showError');

exports.command = 'stop';

exports.desc = 'Stop a server';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('stopServer()', err => {
    if (err) {
      return showError(err);
    }
  });
};
