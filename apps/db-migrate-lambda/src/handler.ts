import type { CloudFormationCustomResourceEvent, Context } from 'aws-lambda';
import { runMigrations } from './migrate';

export async function handler(
  event: CloudFormationCustomResourceEvent,
  _context: Context,
) {
  console.log(JSON.stringify(event));

  const physicalResourceId =
    ('PhysicalResourceId' in event && event.PhysicalResourceId) ||
    'cricket-db-migrate';

  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: physicalResourceId };
  }

  await runMigrations();

  return {
    PhysicalResourceId: physicalResourceId,
    Data: { status: 'migrated' },
  };
}
