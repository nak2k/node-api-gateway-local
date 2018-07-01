const { runShell } = require('../repl');
const { exitOnError } = require('../exitOnError');

exports.command = 'restart-lambda';

exports.desc = 'Restart lambda';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('restartLambda()', exitOnError);
};
