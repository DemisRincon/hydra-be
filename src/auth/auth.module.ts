import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../database/prisma.module.js';
import { UsersModule } from '../users/users.module.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { SupabaseStrategy } from './strategies/supabase.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

// Helper function to check if Supabase is configured
function isSupabaseConfigured(configService: ConfigService): boolean {
  const supabaseUrl =
    configService.get<string>('SUPABASE_URL') ||
    configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
  const supabaseKey =
    configService.get<string>('SUPABASE_ANON_KEY') ||
    configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
    configService.get<string>('SUPABASE_KEY');
  return !!(supabaseUrl && supabaseKey);
}

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '15m';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Conditionally provide SupabaseStrategy only if Supabase is configured
    // OAuth flow works via /api/auth/oauth/supabase endpoint without this strategy
    ...(process.env.SUPABASE_URL || 
        process.env.NEXT_PUBLIC_SUPABASE_URL || 
        process.env.SUPABASE_ANON_KEY || 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? [
          {
            provide: SupabaseStrategy,
            useFactory: (configService: ConfigService) => {
              if (isSupabaseConfigured(configService)) {
                try {
                  return new SupabaseStrategy(configService);
                } catch (error) {
                  console.warn('SupabaseStrategy initialization failed:', error);
                  return null;
                }
              }
              console.log('SupabaseStrategy skipped - Supabase env vars not fully configured.');
              return null;
            },
            inject: [ConfigService],
          },
        ]
      : []),
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

