const express = require('express');
const callInitializer = require('call-initializer');
const {
  aws,
  locals,
  pug,
  render404,
} = require('express-mechanic');
const { dirname } = require('path');
const readJsonFile = require('read-json');

const { apiGatewayLocal } = require('./apiGatewayLocal');

/*
 * Create an application of the express, and configure.
 */
module.exports = (options, callback) => {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }

  loadConfig(options, (err, config) => {
    if (err) {
      return callback(err);
    }

    callInitializer(express(),
      aws(config),
      apiGatewayLocal(config),
      locals({
        meta: {
        },
      }),
      pug(__dirname + '/../views/'),
      render404()
    )(callback);
  });
};

function loadConfig(options, callback) {
  readJsonFile(options.config, (err, config) => {
    if (err) {
      return callback(err);
    }

    /*
     * Set config from CLI options.
     */
    config.config = options.config;
    config.configDir = dirname(config.config);

    callback(null, config);
  });
}
