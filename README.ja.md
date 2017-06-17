# api-gateway-local

## Installation

```
npm i api-gateway-local -D
```

## package.json

```
"scripts": {
  "start-api-gateway": "api-gateway-local"
}
```

## Configuration

カレントディレクトリにある `.api-gateway-local.json` が設定ファイルとして読み込まれる。

```
{
  "region": "REGION",
  "restApiId": "REST_API_ID",
  "lambdas": [
    {
      "name": "FUNCTION_NAME",
      "dir": "FUNCTION_DIRECTORY"
    }
  ]
}
```

## License

MIT
