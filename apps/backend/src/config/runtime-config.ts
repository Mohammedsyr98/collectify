export interface RuntimeConfig {
  port: number;
  frontendOrigins: string[];
  betterAuth: {
    secret: string;
    baseUrl: string;
  };
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const parsedPort = Number.parseInt(env.PORT ?? '3000', 10);
  const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;

  return {
    port,
    frontendOrigins: (env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    betterAuth: {
      secret: readBetterAuthSecret(env),
      baseUrl: env.BETTER_AUTH_URL ?? `http://localhost:${port}/api/auth`,
    },
  };
}

function readBetterAuthSecret(env: NodeJS.ProcessEnv): string {
  if (env.BETTER_AUTH_SECRET) {
    return env.BETTER_AUTH_SECRET;
  }

  if (env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is required in production.');
  }

  return 'collectify-dev-auth-secret-change-before-production';
}
