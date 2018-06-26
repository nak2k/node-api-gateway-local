const { runShell } = require('../repl');

exports.command = 'restart-lambda';

exports.desc = 'Restart lambda';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('restartLambda()');
};
