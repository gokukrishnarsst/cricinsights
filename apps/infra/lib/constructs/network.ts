import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface NetworkProps {
  stage: string;
}

export class Network extends Construct {
  readonly vpc: ec2.Vpc;
  readonly lambdaSecurityGroup: ec2.SecurityGroup;
  readonly databaseSecurityGroup: ec2.SecurityGroup;
  readonly privateSubnetSelection: ec2.SubnetSelection;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.10.0.0/16'),
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC },
        {
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    this.privateSubnetSelection = {
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    };

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc: this.vpc,
      description: `Cricket AI ${props.stage} Lambda SG`,
      allowAllOutbound: true,
    });

    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSg', {
      vpc: this.vpc,
      description: `Cricket AI ${props.stage} Aurora SG`,
      allowAllOutbound: false,
    });

    this.databaseSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Lambda to Aurora connection',
    );

    const vpcEndpointSecurityGroup = new ec2.SecurityGroup(
      this,
      'VpcEndpointSg',
      {
        vpc: this.vpc,
        description: `Cricket AI ${props.stage} interface VPC endpoint SG`,
        allowAllOutbound: true,
      },
    );

    vpcEndpointSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(443),
      'Lambda to AWS interface endpoints',
    );

    const interfaceEndpointProps = {
      subnets: this.privateSubnetSelection,
      securityGroups: [vpcEndpointSecurityGroup],
    };

    this.vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      ...interfaceEndpointProps,
    });

    this.vpc.addInterfaceEndpoint('CloudWatchLogsEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      ...interfaceEndpointProps,
    });

    this.vpc.addInterfaceEndpoint('EcrApiEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      ...interfaceEndpointProps,
    });

    this.vpc.addInterfaceEndpoint('EcrDockerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      ...interfaceEndpointProps,
    });

    this.vpc.addGatewayEndpoint('S3GatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        { subnetType: ec2.SubnetType.PUBLIC },
        this.privateSubnetSelection,
      ],
    });

    new CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC with public subnets, no NAT; Aurora/Lambda in private subnets',
    });
    new CfnOutput(this, 'LambdaSecurityGroupId', {
      value: this.lambdaSecurityGroup.securityGroupId,
    });
    new CfnOutput(this, 'DatabaseSecurityGroupId', {
      value: this.databaseSecurityGroup.securityGroupId,
    });
  }
}
