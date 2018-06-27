const { runShell } = require('../repl');
const { showError } = require('../showError');

exports.command = 'browse';

exports.desc = 'Browse an api';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('browse()', err => {
    if (err) {
      return showError(err);
    }
  });
};
