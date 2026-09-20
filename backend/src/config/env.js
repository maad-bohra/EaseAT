import dotenv from 'dotenv';
dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),

  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    localDir: process.env.LOCAL_STORAGE_DIR || './storage',
    maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'academic-calendars',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'none',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.AI_MODEL || 'claude-sonnet-4-6',
    maxTokens: Number(process.env.AI_MAX_TOKENS || 2000),
    get enabled() {
      return this.provider === 'anthropic' && Boolean(this.apiKey);
    },
  },
};

export const isProd = env.nodeEnv === 'production';
