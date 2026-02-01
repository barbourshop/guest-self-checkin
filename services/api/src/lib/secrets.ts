import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

type SecretCache = {
  value: string;
  timestamp: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const secretCache = new Map<string, SecretCache>();

/**
 * Get a secret value from AWS Secrets Manager with caching
 * @param secretName The name or ARN of the secret
 * @param key Optional JSON key if the secret is a JSON object
 * @returns The secret value
 */
export async function getSecretValue(secretName: string, key?: string): Promise<string> {
  const cacheKey = `${secretName}:${key || ''}`;
  const cached = secretCache.get(cacheKey);
  
  // Return cached value if it's still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName
    });

    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no SecretString`);
    }

    let secretValue: string;
    
    if (key) {
      // Parse as JSON and extract the key
      const secretJson = JSON.parse(response.SecretString);
      if (!(key in secretJson)) {
        throw new Error(`Secret ${secretName} does not contain key "${key}"`);
      }
      secretValue = String(secretJson[key]).trim(); // Trim whitespace
    } else {
      secretValue = response.SecretString.trim(); // Trim whitespace
    }
    
    // Log token info for debugging (without exposing full value)
    if (secretValue && secretValue.length > 10) {
      console.log(`Secret ${secretName}${key ? `[${key}]` : ''} retrieved: length=${secretValue.length}, preview=${secretValue.substring(0, 10)}...${secretValue.substring(secretValue.length - 4)}`);
    }

    // Cache the value
    secretCache.set(cacheKey, {
      value: secretValue,
      timestamp: Date.now()
    });

    return secretValue;
  } catch (error) {
    console.error(`Failed to fetch secret ${secretName}:`, error);
    throw error;
  }
}

