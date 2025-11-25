import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoleModule } from './modules/role/roles.module';
import { PermissionsModule } from './modules/permission/permissions.module';
import { RolePermissionsModule } from './modules/role-permission/role-permissions.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { ChatModule } from './modules/chat/chat.module';
import { RedisModule } from './core/redis/redis.module';
import { UserRoleModule } from './modules/user-role/user-role.module';
import { StockModule } from './modules/stock/stock.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    RoleModule,
    PermissionsModule,
    RolePermissionsModule,
    AuditLogModule,
    ChatModule,
    RedisModule,
    UserRoleModule,
    StockModule,
    WatchlistModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
