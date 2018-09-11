const reqToEvent = req => {
  const { headers, multiValueHeaders } = makeHeadersFromRaw(req.rawHeaders);

  return {
    path: req.path,
    httpMethod: req.method,
    headers,
    multiValueHeaders,
    queryStringParameters: req.query,
    body: typeof(req.body) === 'string' ? req.body : '',
    isBase64Encoded: req.isBase64Encoded,
  };
};

function makeHeadersFromRaw(raw) {
  const headers = {};
  const multiValueHeaders = {};

  for (let i = 0; i < raw.length; i += 2) {
    const name = raw[i];
    const value = raw[i + 1];

    headers[name] = value;

    const {
      [name]: values = multiValueHeaders[name] = [],
    } = multiValueHeaders;

    values.push(value);
  }

  return {
    headers,
    multiValueHeaders,
  };
}

const setResFromResult = (res, result, callback) => {
  if (typeof(result) !== 'object' || result === null) {
    return callback(new Error('Non-object returned by Lambda'));
  }

  const {
    statusCode,
    headers,
    body,
    isBase64Encoded,
    multiValueHeaders,
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

  if (multiValueHeaders) {
    if (typeof(headers) !== 'object') {
      return callback(new Error('Non-object multiValueHeaders returned by Lambda'));
    }

    Object.entries(multiValueHeaders).forEach(([name, values]) => {
      res.setHeader(name, values);
    });
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
