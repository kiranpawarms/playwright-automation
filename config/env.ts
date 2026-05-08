import * as dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  ADMIN_URL: process.env.ADMIN_URL || 'https://dev.mobilesentrix.com/devadmin',
  ADMIN_USER: required('ADMIN_USER'),
  ADMIN_PASS: required('ADMIN_PASS'),
};
