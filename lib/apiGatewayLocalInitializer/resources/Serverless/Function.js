const {
  ALLOWED_VALUES,
  ANY,
  DEFAULT,
  END,
  REQUIRED,
  TYPE,
} = require('cfn-parser');
const { resolve } = require('path');
const {
  genId,
} = require('api-gateway-util');

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
            'AlexaSkill',
            'Api',
            'CloudWatchEvent',
            'CloudWatchLogs',
            'DynamoDB',
            'IoTRule',
            'Kinesis',
            'S3',
            'Schedule',
            'SNS',
            'SQS',
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
      Environment = {},
      Events = {},
    } = Properties;

    let { FunctionName } = Properties;

    if (FunctionName === undefined) {
      const {
        Parameters: {
          'AWS::StackName': {
            Value: StackName,
          }
        }
      } = context;

      FunctionName = `${StackName}-${LogicalId}-${genId()}`;
    }

    const mergedEnvironment = GlobalFunction.Environment
      ? Object.assign({}, GlobalFunction.Environment.Variables, Environment.Variables)
      : Environment.Variables;

    if (context.lambdas[FunctionName]) {
      return callback(ERR_SERVERLESS_FUNCTION_DUPLICATED(FunctionName));
    }

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

    /*
     * Set the physical Id.
     */
    dataRef.data.PhysicalId = FunctionName;

    callback(null);
  },
};
