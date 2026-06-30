import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { databaseNameForEnv } from '@cricket-ai/database';
import { Network } from './constructs/network.js';
import { Database } from './constructs/database.js';
import { DatabaseMigrate } from './constructs/database-migrate.js';

export interface CricketStackProps extends cdk.StackProps {
  envName: string;
}

export class CricketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CricketStackProps) {
    super(scope, id, props);

    const network = new Network(this, 'Network', {
      stage: props.envName,
    });

    const dbName = databaseNameForEnv(props.envName);
    const database = new Database(this, 'Database', {
      stageName: props.envName,
      vpc: network.vpc,
      databaseSecurityGroup: network.databaseSecurityGroup,
      defaultDatabaseName: dbName,
    });

    new DatabaseMigrate(this, 'DatabaseMigrate', {
      vpc: network.vpc,
      vpcSubnets: network.privateSubnetSelection,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseSecret: database.secret,
      databaseCluster: database.cluster,
      databaseEndpoint: database.cluster.clusterEndpoint.hostname,
      databaseName: dbName,
    });
  }
}
