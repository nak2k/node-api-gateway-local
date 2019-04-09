const run = require('../run');
const readJsonFile = require('read-json');
const { dirname } = require('path');
const { exitOnError } = require('../exitOnError');
const { getPort } = require('hashed-port');

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
        default: 'template.yaml',
      },
      'parameter-overrides': {
        describe: 'A list of parameters',
        type: 'array',
      },
      open: {
        describe: 'Open automatically',
        type: 'boolean',
      }
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

    if (argv.stackName !== undefined) {
      config.stackName = argv.stackName;
    }

    if (argv.templateFile !== undefined) {
      config.template = argv.templateFile;
    }

    if (argv.parameterOverrides !== undefined) {
      if (config.Parameters === undefined) {
        config.Parameters = {};
      }

      for (const p of argv.parameterOverrides) {
        const [Name, Value] = p.split('=');

        if (Value === undefined) {
          return exitOnError(new Error(`Parameter '${Name}' must have a value`));
        }

        config.Parameters[Name] = {
          Value,
        };
      }
    }

    if (argv.open !== undefined) {
      config.open = argv.open;
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
    if (config.port) {
      run(config, exitOnError);
    } else {
      getPort((err, port) => {
        if (err) {
          return exitOnError(err);
        }

        config.port = port;

        run(config, exitOnError);
      });
    }
  });
};
