import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-change-me-zms-enterprise-2026';
const SYSTEM_ADMIN_ID = 'fb5ffe28-f8a4-4a51-884f-3c4de9c34a6d';

export function createServiceToken(userId = SYSTEM_ADMIN_ID): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: now + 3600, iat: now }),
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export async function proxyToNest(
  endpoint: string,
  request: NextRequest,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  try {
    const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    // Forward incoming authorization or inject service token
    let authHeader = request.headers.get('authorization');
    if (!authHeader) {
      // Check cookies for token
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/zms_access_token=([^;]+)/);
      if (match) {
        authHeader = `Bearer ${match[1]}`;
      }
    }

    if (authHeader) {
      headers.set('authorization', authHeader);
    } else {
      headers.set('authorization', `Bearer ${createServiceToken()}`);
    }

    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers.set('cookie', cookieHeader);
    }

    const method = options.method || request.method;
    let body = options.body;
    if (body === undefined && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.clone().json();
      } catch {
        body = undefined;
      }
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการหลัก' },
      { status: 502 }
    );
  }
}
