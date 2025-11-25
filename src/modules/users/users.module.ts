import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from 'prisma/prisma.module';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  imports: [UploadModule, PrismaModule],
  providers: [UsersService, PrismaService],
  controllers: [UsersController],
  exports: [UsersModule, UsersService]
})
export class UsersModule {}
