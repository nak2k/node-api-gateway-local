const { runShell } = require('../repl');
const { exitOnError } = require('../exitOnError');

exports.command = 'stop';

exports.desc = 'Stop a server';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('stopServer()', exitOnError);
};
