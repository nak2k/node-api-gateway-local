const run = require('../run');
const readJsonFile = require('read-json');
const { dirname } = require('path');
const { exitOnError } = require('../exitOnError');

exports.command = 'start';

exports.desc = 'Start a server';

exports.builder = yargs => {
  yargs
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
      'template-file': {
        describe: 'A path of SAM template file',
      },
    })
};

exports.handler = argv => {
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

    if (argv['template-file'] !== undefined) {
      config.template = argv['template-file'];
    }

    config.verbose = argv.verbose;

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
    run(config, exitOnError);
  });
};
