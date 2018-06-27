const { runShell } = require('../repl');
const { showError } = require('../showError');

exports.command = 'shell';

exports.desc = 'Run a shell to run commands in api-gateway-local';

exports.buider = yargs => {
};

exports.handler = argv => {
  const [, ...rest] = argv._;

  runShell(rest.join(' '), err => {
    if (err) {
      return showError(err);
    }
  });
};
