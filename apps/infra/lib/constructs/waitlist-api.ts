import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WaitlistApiProps {
  vpc: ec2.IVpc;
  vpcSubnets: ec2.SubnetSelection;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  databaseCluster: rds.IDatabaseCluster;
  databaseEndpoint: string;
  databaseName: string;
  corsAllowOrigin?: string;
}

export class WaitlistApi extends Construct {
  readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: WaitlistApiProps) {
    super(scope, id);

    const repoRoot = join(__dirname, '../../../..');

    const waitlistFn = new lambdaNodejs.NodejsFunction(this, 'WaitlistFn', {
      entry: join(repoRoot, 'apps/waitlist-api/src/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(30),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: [props.lambdaSecurityGroup],
      environment: {
        DATABASE_HOST: props.databaseEndpoint,
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        DATABASE_NAME: props.databaseName,
        CORS_ALLOW_ORIGIN:
          props.corsAllowOrigin ?? 'https://cricinsights.com',
        NODE_ENV: 'production',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node22',
        format: lambdaNodejs.OutputFormat.ESM,
        mainFields: ['module', 'main'],
        externalModules: ['@aws-sdk/*'],
      },
    });

    props.databaseSecret.grantRead(waitlistFn);
    waitlistFn.node.addDependency(props.databaseCluster);

    this.functionUrl = waitlistFn.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: [
          props.corsAllowOrigin ?? 'https://cricinsights.com',
          'http://localhost:4200',
          'http://localhost:3000',
        ],
        allowedMethods: [lambda.HttpMethod.POST, lambda.HttpMethod.OPTIONS],
        allowedHeaders: ['Content-Type'],
      },
    });

    new CfnOutput(this, 'WaitlistApiUrl', {
      value: this.functionUrl.url,
      description: 'Waitlist API Function URL',
    });
  }
}
