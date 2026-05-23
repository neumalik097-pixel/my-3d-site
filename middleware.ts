import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // تمرير الطلب مباشرة وبدون أي شروط تحويل إجبارية من السيرفر لمنع التعليق
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};