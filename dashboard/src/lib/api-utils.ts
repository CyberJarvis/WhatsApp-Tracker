import { NextRequest, NextResponse } from 'next/server'

/**
 * Safely parse JSON from a request body
 * Returns the parsed JSON or a NextResponse error if parsing fails
 */
export async function parseJsonBody<T = unknown>(
  request: NextRequest
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const data = await request.json()
    return { data: data as T }
  } catch {
    return {
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Standard error response for unauthorized access
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Standard error response for not found
 */
export function notFoundResponse(resource: string = 'Resource') {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 })
}

/**
 * Standard error response for server errors
 */
export function serverErrorResponse(message: string = 'Internal server error') {
  return NextResponse.json({ error: message }, { status: 500 })
}

/**
 * Standard error response for bad requests
 */
export function badRequestResponse(message: string = 'Bad request') {
  return NextResponse.json({ error: message }, { status: 400 })
}
