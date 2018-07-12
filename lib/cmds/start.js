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
      'stack-name': {
        describe: 'A name of CloudFormation stack',
      },
      'template-file': {
        describe: 'A path of SAM template file',
      },
      'parameter-overrides': {
        describe: 'A list of parameters',
        type: 'array',
      },
    })
};

exports.handler = argv => {
  readJsonFile(argv.config, (err, config) => {
    if (err) {
      if (err.code !== 'ENOENT') {
        return exitOnError(err);
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

    if (argv['stack-name'] !== undefined) {
      config.stackName = argv['stack-name'];
    }

    if (argv['template-file'] !== undefined) {
      config.template = argv['template-file'];
    }

    if (argv['parameter-overrides'] !== undefined) {
      if (config.Parameters === undefined) {
        config.Parameters = {};
      }

      for (const p of argv['parameter-overrides']) {
        const [Name, Value] = p.split('=');

        if (Value === undefined) {
          return exitOnError(new Error(`Parameter '${Name}' must have a value`));
        }

        config.Parameters[Name] = {
          Value,
        };
      }
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
      return exitOnError(new Error('AWS region must be specified'));
    }

    /*
     * Start the server.
     */
    run(config, exitOnError);
  });
};
