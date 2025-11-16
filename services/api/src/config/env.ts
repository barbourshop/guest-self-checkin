export type RuntimeEnv = {
  SQUARE_ENV: 'sandbox' | 'production';
  SQUARE_API_BASE_URL: string;
  SQUARE_API_VERSION: string;
  SQUARE_LOCATION_ID: string;
  CUSTOMER_HASH_SALT: string;
  MEMBERSHIP_SEGMENT_ID: string;
  DAY_PASS_ITEM_IDS: string;
  MEMBERSHIP_ITEM_IDS: string;
  CONFIG_TABLE_NAME: string;
  PASSES_TABLE_NAME: string;
  CHECKINS_TABLE_NAME: string;
};

const REQUIRED_VARS: Array<keyof RuntimeEnv> = [
  'SQUARE_ENV',
  'SQUARE_API_BASE_URL',
  'SQUARE_API_VERSION',
  'SQUARE_LOCATION_ID',
  'CUSTOMER_HASH_SALT',
  'MEMBERSHIP_SEGMENT_ID',
  'DAY_PASS_ITEM_IDS',
  'MEMBERSHIP_ITEM_IDS',
  'CONFIG_TABLE_NAME',
  'PASSES_TABLE_NAME',
  'CHECKINS_TABLE_NAME'
];

export function loadEnv(): RuntimeEnv {
  const env = Object.create(null);
  for (const key of REQUIRED_VARS) {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Missing required env var ${key}`);
    }
    env[key] = value;
  }
  return env as RuntimeEnv;
}

