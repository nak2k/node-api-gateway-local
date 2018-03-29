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
