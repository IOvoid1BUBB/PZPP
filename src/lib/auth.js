import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import AtlassianProvider from "next-auth/providers/atlassian";
import bcrypt from "bcryptjs";

function isConfigured(...values) {
  return values.every((value) => typeof value === "string" && value.trim().length > 0);
}

const oauthProviders = [];

if (isConfigured(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)) {
  oauthProviders.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly",
          access_type: "offline",
          prompt: "consent",
          response_type: "code",
        },
      },
    })
  );
}

if (
  isConfigured(
    process.env.AZURE_AD_CLIENT_ID,
    process.env.AZURE_AD_CLIENT_SECRET,
    process.env.AZURE_AD_TENANT_ID
  )
) {
  oauthProviders.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email Mail.Read Calendars.Read offline_access",
          prompt: "consent",
        },
      },
    })
  );
}

if (isConfigured(process.env.ATLASSIAN_CLIENT_ID, process.env.ATLASSIAN_CLIENT_SECRET)) {
  oauthProviders.push(
    AtlassianProvider({
      clientId: process.env.ATLASSIAN_CLIENT_ID,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:jira-work read:jira-user offline_access",
          prompt: "consent",
        },
      },
    })
  );
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...oauthProviders,
    CredentialsProvider({
      name: "credentials",
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      // OAuth providers in integration mode (e.g. Atlassian) may not expose email.
      // We still allow the flow so the currently logged-in user can connect provider account.
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const preserveExistingSessionIdentity =
          account?.provider !== "credentials" &&
          Boolean(token?.id) &&
          Boolean(token?.role) &&
          !user?.role;

        token.role = user.role ?? token.role;
        if (!preserveExistingSessionIdentity) {
          token.id = user.id ?? token.id;
        }
      }

      if (token?.id && !token?.role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true },
        });
        token.role = dbUser?.role ?? token.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
};