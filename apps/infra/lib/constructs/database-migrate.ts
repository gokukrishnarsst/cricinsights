import * as cr from 'aws-cdk-lib/custom-resources';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { CustomResource, Duration, FileSystem } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export interface DatabaseMigrateProps {
  vpc: ec2.IVpc;
  vpcSubnets: ec2.SubnetSelection;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecret: secretsmanager.ISecret;
  databaseCluster: rds.IDatabaseCluster;
  databaseEndpoint: string;
  databaseName: string;
}

export class DatabaseMigrate extends Construct {
  readonly resource: CustomResource;

  constructor(scope: Construct, id: string, props: DatabaseMigrateProps) {
    super(scope, id);

    // Get the monorepo root path relative to this file
    const repoRoot = join(__dirname, '../../../..');

    const artifactHash = [
      FileSystem.fingerprint(join(repoRoot, 'libs/database/flyway/sql')),
      FileSystem.fingerprint(join(repoRoot, 'apps/db-migrate-lambda')),
    ].join(':');

    const migrateFn = new lambda.DockerImageFunction(this, 'MigrateFn', {
      architecture: lambda.Architecture.X86_64,
      code: lambda.DockerImageCode.fromImageAsset(repoRoot, {
        file: 'apps/db-migrate-lambda/Dockerfile',
        platform: ecr_assets.Platform.LINUX_AMD64,
        exclude: [
          '**/node_modules',
          '**/cdk.out',
          '.git',
          'dist/apps',
          '**/*.md',
        ],
      }),
      memorySize: 512,
      timeout: Duration.minutes(15),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: [props.lambdaSecurityGroup],
      environment: {
        DATABASE_HOST: props.databaseEndpoint,
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        DATABASE_NAME: props.databaseName,
        NODE_ENV: 'production',
      },
    });

    props.databaseSecret.grantRead(migrateFn);

    const provider = new cr.Provider(this, 'Provider', {
      onEventHandler: migrateFn,
    });

    this.resource = new CustomResource(this, 'Resource', {
      serviceToken: provider.serviceToken,
      properties: {
        artifactHash,
      },
    });

    this.resource.node.addDependency(props.databaseCluster);
  }
}
