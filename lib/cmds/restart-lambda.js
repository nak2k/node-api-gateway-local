const { runShell } = require('../repl');
const { showError } = require('../showError');

exports.command = 'restart-lambda';

exports.desc = 'Restart lambda';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('restartLambda()', err => {
    if (err) {
      return showError(err);
    }
  });
};
