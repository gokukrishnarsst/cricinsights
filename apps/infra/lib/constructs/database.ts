import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DEFAULT_DATABASE_USER } from '@cricket-ai/database';

export interface DatabaseProps {
  stageName: string;
  vpc: ec2.IVpc;
  databaseSecurityGroup: ec2.ISecurityGroup;
  defaultDatabaseName?: string;
}

export class Database extends Construct {
  readonly secret: secretsmanager.ISecret;
  readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    const dbName = props.defaultDatabaseName ?? `cricket_${props.stageName}`;

    this.secret = new secretsmanager.Secret(this, 'DatabaseSecret', {
      secretName: `cricket/${props.stageName}/database`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: DEFAULT_DATABASE_USER }),
        generateStringKey: 'password',
        excludePunctuation: true,
      },
    });

    this.cluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [props.databaseSecurityGroup],
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      defaultDatabaseName: dbName,
      removalPolicy: RemovalPolicy.DESTROY,
      backup: { retention: Duration.days(7) },
    });

    new CfnOutput(this, 'DatabaseEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
    });
    new CfnOutput(this, 'DatabaseSecretArn', {
      value: this.secret.secretArn,
    });
  }
}
