#!/usr/bin/env node
import 'dotenv/config';
import { App } from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack.js';

const app = new App();

new AppStack(app, 'GuestSelfCheckInAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1'
  }
});

