const express = require('express');
const callInitializer = require('call-initializer');
const {
  aws,
  locals,
  pug,
  render404,
} = require('express-mechanic');

const { apiGatewayLocalInitializer } = require('./apiGatewayLocalInitializer');

/*
 * Create an application of the express, and configure.
 */
module.exports = (options, callback) => {
  if (typeof options === 'function') {
    [options, callback] = [{}, options];
  }

  callInitializer(express(),
    aws(options),
    apiGatewayLocalInitializer(options),
    locals({
      meta: {
      },
    }),
    pug(__dirname + '/../views/'),
    render404()
  )(callback);
};
