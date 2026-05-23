import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { createSupabaseAdmin } from './supabase';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: { strategy: 'jwt' },

  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the very first sign-in for this session.
      // Upsert the user row and pull back the id so it lives in the JWT.
      if (user) {
        const supabase = createSupabaseAdmin();
        const { data } = await supabase
          .from('users')
          .upsert(
            {
              email: token.email!,
              name: token.name ?? null,
              image: (token.picture as string | null) ?? null,
            },
            { onConflict: 'email' }
          )
          .select('id')
          .single();

        if (data) {
          token.userId = data.id as string;
        }
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) ?? '';
      }
      return session;
    },
  },

  pages: {
    signIn: '/',
  },
};
