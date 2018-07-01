const { runShell } = require('../repl');
const { exitOnError } = require('../exitOnError');

exports.command = 'browse';

exports.desc = 'Browse an api';

exports.buider = yargs => {
};

exports.handler = argv => {
  runShell('browse()', exitOnError);
};
