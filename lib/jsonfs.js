const { writeFile, readFile } = require('fs');
const mkdirp = require('mkdirp');
const { dirname } = require('path');

exports.readJsonFile = (path, callback) =>
  readFile(path, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }

    try {
      callback(null, JSON.parse(data));
    } catch (err) {
      callback(err);
    }
  });

exports.writeJsonFile = (path, data, callback) =>
  mkdirp(dirname(path), err => {
    if (err) {
      return callback(err);
    }

    writeFile(path, JSON.stringify(data, null, 2), err => {
      if (err) {
        return callback(err);
      }

      callback(null);
    });
  });
