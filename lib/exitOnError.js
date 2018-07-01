const { red } = require('chalk');

function exitOnError(err) {
  if (err) {
    showError(err);
    process.exit(1);
  }
}

function showError(err) {
  console.error(`[${red('ERROR')}] ${err.message}`);

  const { errors } = err;

  if (errors) {
    errors.forEach(showError);
  }

  if (process.env.DEBUG) {
    console.error();
    console.error(err);
  }
}

/*
 * Exports.
 */
exports.exitOnError = exitOnError;
