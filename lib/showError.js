const { red } = require('chalk');

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
exports.showError = showError;
