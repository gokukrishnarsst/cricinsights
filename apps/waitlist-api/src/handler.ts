import {
  addToWaitlist,
  WaitlistDuplicateError,
  WaitlistInvalidEmailError,
} from '@cricket-ai/database';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN ?? '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(
  statusCode: number,
  body: Record<string, string>,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (event.requestContext.http.method !== 'POST') {
    return jsonResponse(405, { message: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body ?? '{}') as { email?: string };

    if (!body.email || typeof body.email !== 'string') {
      return jsonResponse(400, { message: 'Email is required' });
    }

    await addToWaitlist(body.email);
    return jsonResponse(201, { message: 'Successfully joined the waitlist' });
  } catch (error) {
    if (error instanceof WaitlistInvalidEmailError) {
      return jsonResponse(400, { message: 'Invalid email address' });
    }

    if (error instanceof WaitlistDuplicateError) {
      return jsonResponse(409, {
        message: 'This email is already on the waitlist',
      });
    }

    console.error('Waitlist error:', error);
    return jsonResponse(500, { message: 'Internal server error' });
  }
}
