const yargs = require('yargs');
const run = require('./run');
const readJsonFile = require('read-json');
const { dirname } = require('path');
const { red } = require('chalk');

function main() {
  const argv = yargs
    .options({
      region: {
        alias: 'r',
        describe: 'AWS Region',
      },
      config: {
        alias: 'c',
        describe: 'A path of configuration file',
        default: './.api-gateway-local.json',
      },
      port: {
        describe: 'Listen port',
        type: 'number',
      },
    })
    .help()
    .argv;

  readJsonFile(argv.config, (err, config) => {
    if (err) {
      if (err.code !== 'ENOENT') {
        return showError(err);
      }

      config = {};
    }

    /*
     * Set config from CLI options.
     */
    config.configDir = dirname(argv.config);

    if (argv.port !== undefined) {
      config.port = argv.port;
    }

    if (argv.region !== undefined) {
      config.region = argv.region;
    }

    /*
     * Set config from environment variables.
     */
    if (config.region === undefined) {
      config.region = process.env.AWS_REGION;
    }

    /*
     * Check config.
     */
    if (!config.region) {
      return showError(new Error('AWS region must be specified'));
    }

    /*
     * Start the server.
     */
    run(config);
  });
}

function showError(err) {
  console.error(`[${red('ERROR')}] ${err.message}`);

  if (process.env.DEBUG) {
    console.error();
    console.error(err);
  }
}

main();
