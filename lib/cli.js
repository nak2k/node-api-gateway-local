const yargs = require('yargs');

function main() {
  const argv = yargs
    .commandDir('cmds')
    .demandCommand()
    .options({
      verbose: {
        alias: 'v',
        describe: 'Verbose mode',
        type: 'boolean',
      },
    })
    .completion()
    .version()
    .help()
    .argv;
}

main();
