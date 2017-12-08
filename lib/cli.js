const yargs = require('yargs');
const run = require('./run');
const readJsonFile = require('read-json');
const { dirname } = require('path');

function main() {
  const argv = yargs
    .options({
      region: {
        alias: 'r',
        describe: 'AWS Region',
        default: process.env.AWS_REGION,
      },
      config: {
        alias: 'c',
        describe: 'A path of configuration file',
        default: process.cwd() + '/.api-gateway-local.json',
      },
    })
    .help()
    .argv;

  readJsonFile(argv.config, (err, config) => {
    if (err) {
      return showError(err);
    }

    /*
     * Set config from CLI options.
     */
    config.configDir = dirname(argv.config);

    /*
     * Start the server.
     */
    run(config);
  });
}

function showError(err) {
  console.error(err);
}

main();
