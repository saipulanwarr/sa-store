/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth'
import { prisma } from '@/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const config = {
    pages: {
        signIn: '/sign-in',
        error: '/sign-in'
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, //30 days
    },
    adapter: PrismaAdapter(prisma),
    providers: [CredentialsProvider({
        credentials: {
            email: {type: 'email'},
            password: {type: 'password'}
        },
        async authorize(credentials){
            if(credentials === null) return null;

            const user = await prisma.user.findFirst({
                where: {
                    email: credentials.email as string,
                }
            })

            if(user && user.password){
                const isMatch = compareSync(credentials.password as string, user.password);

                if(isMatch){
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                }
            }

            return null;
        }
    })],
    callbacks: {
        async session({ session, user, trigger, token }: any) {
          session.user.id = token.sub
          session.user.role = token.role;
          if (trigger === 'update') {
            session.user.name = user.name
            session.user.role = token.role;
            session.user.name = token.name;
          }
          return session
        },
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
              // Assign user properties to the token
              token.id = user.id;
              token.role = user.role;
          
              if (trigger === 'signIn' || trigger === 'signUp') {
                const cookiesObject = await cookies();
                const sessionCartId = cookiesObject.get('sessionCartId')?.value;
          
                if (sessionCartId) {
                  const sessionCart = await prisma.cart.findFirst({
                    where: { sessionCartId },
                  });
          
                  if (sessionCart) {
                    // Overwrite any existing user cart
                    await prisma.cart.deleteMany({
                      where: { userId: user.id },
                    });
          
                    // Assign the guest cart to the logged-in user
                    await prisma.cart.update({
                      where: { id: sessionCart.id },
                      data: { userId: user.id },
                    });
                  }
                }
              }
            }

            if (session?.user.name && trigger === 'update') {
              token.name = session.user.name;
            }
          
            return token;
        },
        authorized({ request, auth }: any) {
            // Array of regex patterns of paths we want to protect
            const protectedPaths = [
              /\/shipping-address/,
              /\/payment-method/,
              /\/place-order/,
              /\/profile/,
              /\/user\/(.*)/,
              /\/order\/(.*)/,
              /\/admin/,
            ];
      
            // Get pathname from the req URL object
            const { pathname } = request.nextUrl;
      
            // Check if user is not authenticated and accessing a protected path
            if (!auth && protectedPaths.some((p) => p.test(pathname))) return false;
      
            // Check for session cart cookie
            if (!request.cookies.get('sessionCartId')) {
              // Generate new session cart id cookie
              const sessionCartId = crypto.randomUUID();
      
              // Clone the req headers
              const newRequestHeaders = new Headers(request.headers);
      
              // Create new response and add the new headers
              const response = NextResponse.next({
                request: {
                  headers: newRequestHeaders,
                },
              });
      
              // Set newly generated sessionCartId in the response cookies
              response.cookies.set('sessionCartId', sessionCartId);
      
              return response;
            } else {
              return true;
            }
        },
    },
} satisfies NextAuthConfig;

export const {handlers, auth, signIn, signOut} = NextAuth(config)