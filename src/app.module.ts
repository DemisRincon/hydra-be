import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RolesModule } from './roles/roles.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { SearchModule } from './search/search.module.js';
import { ProductsModule } from './products/products.module.js';
import { LanguagesModule } from './languages/languages.module.js';
import { ConditionsModule } from './conditions/conditions.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { HareruyaModule } from './hareruya/hareruya.module.js';
import { TagsModule } from './tags/tags.module.js';
import { TcgsModule } from './tcgs/tcgs.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    RolesModule,
    ListingsModule,
    SearchModule,
    ProductsModule,
    LanguagesModule,
    ConditionsModule,
    CategoriesModule,
    HareruyaModule,
    TagsModule,
    TcgsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [PrismaModule],
})
export class AppModule {}
