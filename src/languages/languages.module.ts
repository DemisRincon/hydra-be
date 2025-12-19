import { Module } from '@nestjs/common';
import { LanguagesService } from './languages.service.js';
import { LanguagesController } from './languages.controller.js';
import { PrismaModule } from '../database/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [LanguagesController],
  providers: [LanguagesService],
  exports: [LanguagesService],
})
export class LanguagesModule {}

