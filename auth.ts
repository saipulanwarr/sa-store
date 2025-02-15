/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth'
import { prisma } from '@/db/prisma';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSync } from 'bcrypt-ts-edge';
import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

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
        async jwt({token, user}: any){
            if(user){
                token.role = user.role;

                if(user.name === 'NO_NAME'){
                    token.name = user.email!.split('@')[0]

                    await prisma.user.update({
                        where: {
                            id: user.id,
                        },
                        data: {
                            name: token.name
                        }
                    })
                }
            }
            return token;
        },
        authorized({request, auth}: any){
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