import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';
import { SupabaseAuthStrategy } from 'nestjs-supabase-auth';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseStrategy extends PassportStrategy(
  SupabaseAuthStrategy,
  'supabase',
) {
  public constructor(private configService: ConfigService) {
    const supabaseUrl = 
      configService.get<string>('SUPABASE_URL') || 
      configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    
    const supabaseKey = 
      configService.get<string>('SUPABASE_ANON_KEY') || 
      configService.get<string>('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      configService.get<string>('SUPABASE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      // Don't throw - let the factory handle optional initialization
      // This allows OAuth to work without this strategy
      throw new Error('Supabase URL and Key must be configured to use SupabaseStrategy');
    }

    super({
      supabaseUrl,
      supabaseKey,
      supabaseOptions: {},
      extractor: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: any): Promise<any> {
    return super.validate(payload);
  }

  authenticate(req: any) {
    super.authenticate(req);
  }
}

