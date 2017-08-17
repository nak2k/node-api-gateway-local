const reqToEvent = req =>
  ({
    path: req.path,
    httpMethod: req.method,
    headers: makeHeadersFromRaw(req.rawHeaders),
    queryStringParameters: req.query,
    body: typeof(req.body) === 'string' ? req.body : '',
    isBase64Encoded: req.isBase64Encoded,
  });

function makeHeadersFromRaw(raw) {
  const headers = {
  };

  for (let i = 0; i < raw.length; i += 2) {
    headers[raw[i]] = raw[i + 1];
  }

  return headers;
}

const setResFromResult = (res, result, callback) => {
  const {
    statusCode,
    headers,
    body,
    isBase64Encoded,
  } = result;

  if (typeof(statusCode) !== 'number') {
    return callback(new Error('No statusCode returned by Lambda'));
  }

  res.status(statusCode);

  if (headers) {
    if (typeof(headers) !== 'object') {
      return callback(new Error('Non-object headers returned by Lambda'));
    }

    res.set(headers);
  }

  if (body) {
    if (typeof(body) !== 'string') {
      return callback(new Error('Non-string body returned by Lambda'));
    }

    if (isBase64Encoded) {
      res.send(Buffer.from(body, 'base64'));
    } else {
      res.send(body);
    }
  }

  callback(null, null);
};

exports.reqToEvent = reqToEvent;
exports.setResFromResult = setResFromResult;
exports.makeHeadersFromRaw = makeHeadersFromRaw;
