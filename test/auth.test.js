import { describe, it, expect } from 'vitest';
import { handleLoginRequest } from '../functions/api/auth/index';

describe('Authentication API', () => {
  it('handleLoginRequest should return a Response object', async () => {
    const request = new Request('http://localhost/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
    });
    const env = {
      DB: {
        prepare: (query) => ({
          bind: (...params) => ({
            all: () => ({ results: [] }), // Simulate no user found for SELECT queries
            run: () => ({ success: true }), // Simulate successful run for INSERT/UPDATE/DELETE
            first: () => null, // Simulate no user found for .first() calls
          }),
        }),
      },
      JWT_SECRET: 'test_secret'
    };
    const response = await handleLoginRequest(request, env);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(401); // Expecting 401 as user won't exist
  });
});