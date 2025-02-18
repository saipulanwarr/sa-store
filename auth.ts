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
          
            return token;
        },
        authorized({request, auth}: any){
            const protectedPaths = [
                /\/shipping-address/,
                /\/payment-method/,
                /\/place-order/,
                /\/profile/,
                /\/user\/(.*)/,
                /\/order\/(.*)/,
                /\/admin/,
            ];

            const {pathname} = request.nextUrl;

            if(!request.cookies.get('sessionCartId')){
                const sessionCartId = crypto.randomUUID();
                const newRequestHeaders = new Headers(request.headers);

                const response = NextResponse.next({
                    request: {
                        headers: newRequestHeaders
                    }
                })

                response.cookies.set('sessionCartId', sessionCartId);

                return response;
            }else{
                return true;
            }
        }
    },
} satisfies NextAuthConfig;

export const {handlers, auth, signIn, signOut} = NextAuth(config)