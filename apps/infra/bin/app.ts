#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { CricketStack } from '../lib/cricket-stack.js';

const app = new App();

const envName = process.env.ENV ?? 'dev';
const region = process.env.REGION ?? 'ap-southeast-2';
const account = process.env.CDK_DEFAULT_ACCOUNT;

new CricketStack(app, `CricketStack-${envName}`, {
  envName,
  env: {
    account,
    region,
  },
});

app.synth();
