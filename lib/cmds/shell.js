const { tmpdir } = require('hashed-tmp');
const net = require('net');

exports.command = 'shell';

exports.desc = 'Run a shell to run commands in api-gateway-local';

exports.buider = yargs => {
};

exports.handler = argv => {
  const tmp = tmpdir({
    basedir: 'api-gateway-local',
    src: process.cwd(),
    length: 16,
  });

  const socketPath = `${tmp}/repl-sock`;

  const [, ...rest] = argv._;

  if (rest.length === 0) {
    net.connect(socketPath, function() {
      this.pipe(process.stdout);
      process.stdin.pipe(this);
    });
  } else {
    net.connect(socketPath, function() {
      this.pipe(process.stdout);
    }).end(rest.join(' ') + '\n');
  }
};
