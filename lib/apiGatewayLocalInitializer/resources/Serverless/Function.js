const {
  ALLOWED_VALUES,
  ANY,
  DEFAULT,
  END,
  REQUIRED,
  TYPE,
} = require('cfn-parser');
const { resolve } = require('path');

/**
 * Parse a function resource.
 */
exports['AWS::Serverless::Function'] = {
  Properties: {
    Handler: {
      [TYPE]: String,
      [REQUIRED]: false,
    },

    Runtime: {
      [TYPE]: String,
      [REQUIRED]: false,
    },

    Events: {
      [DEFAULT]: {},

      [ANY]: {
        Type: {
          [TYPE]: String,
          [REQUIRED]: true,
          [ALLOWED_VALUES]: [
            'S3', 'Api', 'SNS', 'Kinesis', 'DynamoDB', 'Schedule',
            'CloudWatchEvent', 'IoTRule', 'AlexaSkill',
          ],
        },

        Properties: {
          [TYPE]: Object,
        },
      },
    },

    FunctionName: {
      [TYPE]: String,
      [REQUIRED]: false,
    },

    Environment: {
      [REQUIRED]: false,

      Variables: {
        [TYPE]: Object,
        [REQUIRED]: true,
      },
    },
  },

  [END]: (dataRef, context, callback) => {
    const { LogicalId, Properties } = dataRef.data;

    const GlobalFunction = context.Globals.Function;

    const {
      Handler = GlobalFunction.Handler,
      Runtime = GlobalFunction.Runtime,
      CodeUri = GlobalFunction.CodeUri,
      FunctionName = LogicalId,
      Environment = {},
      Events = {},
    } = Properties;

    const mergedEnvironment = GlobalFunction.Environment
      ? Object.assign({}, GlobalFunction.Environment.Variables, Environment.Variables)
      : Environment.Variables;

    if (context.lambdas[FunctionName]) {
      return callback(ERR_SERVERLESS_FUNCTION_DUPLICATED(FunctionName));
    }

    /*
     * Events for implicit Apis.
     */
    Object.values(Events).forEach(event => {
      if (event.Type !== 'Api' || event.Properties.RestApiId) {
        return;
      }

      context.implicitApiEvents.push({
        functionName: FunctionName,
        event,
      });
    });

    /*
     * Set an options of spawnLambda on the context.
     */
    const {
      'AWS::Region': {
        Value: Region,
      },
      'AWS::AccountId': {
        Value: AccountId,
      },
    } = context.Parameters;

    context.lambdas[FunctionName] = {
      arn: `arn:local:lambda:${Region}:${AccountId}:function:${FunctionName}`,
      dir: CodeUri === undefined ? context.templateDir : resolve(context.templateDir, CodeUri),
      handler: Handler,
      region: Region,
      lambdaEnv: mergedEnvironment,
    };

    callback(null);
  },
};
