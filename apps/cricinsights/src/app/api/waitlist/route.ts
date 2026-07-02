import {
  addToWaitlist,
  WaitlistDuplicateError,
  WaitlistInvalidEmailError,
} from '@cricket-ai/database';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };

    if (!body.email || typeof body.email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 },
      );
    }

    await addToWaitlist(body.email);

    return NextResponse.json(
      { message: 'Successfully joined the waitlist' },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof WaitlistInvalidEmailError) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 },
      );
    }

    if (error instanceof WaitlistDuplicateError) {
      return NextResponse.json(
        { message: 'This email is already on the waitlist' },
        { status: 409 },
      );
    }

    console.error('Waitlist error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

export function GET() {
  return NextResponse.json({ message: 'Method not allowed' }, { status: 405 });
}
