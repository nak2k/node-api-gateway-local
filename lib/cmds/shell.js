const { runShell } = require('../repl');

exports.command = 'shell';

exports.desc = 'Run a shell to run commands in api-gateway-local';

exports.buider = yargs => {
};

exports.handler = argv => {
  const [, ...rest] = argv._;

  runShell(rest.join(' '));
};
