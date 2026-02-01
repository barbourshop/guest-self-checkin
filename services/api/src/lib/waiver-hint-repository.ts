import { PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export class WaiverHintRepository {
  constructor(private readonly client: DynamoDBDocumentClient, private readonly tableName: string) {}

  async upsert(input: { customerHash: string; waiverVersion: string; acknowledgedAt: string }) {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          pk: `WAIVER#${input.customerHash}`,
          sk: input.waiverVersion,
          customerHash: input.customerHash,
          waiverVersion: input.waiverVersion,
          acknowledgedAt: input.acknowledgedAt
        }
      })
    );
  }
}

