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
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { PortfolioItemModule } from './modules/portfolio-item/portfolio-item.module';
import { PortfolioSnapshotModule } from './modules/portfolio-snapshot/portfolio-snapshot.module';
import { TradingAccountModule } from './modules/trading-account/trading-account.module';
import { OrderModule } from './modules/order/order.module';
import { PositionModule } from './modules/position/position.module';
import { MarketDepthModule } from './modules/market-depth/market-depth.module';
import { TechnicalIndicatorsModule } from './modules/technical-indicators/technical-indicators.module';
import { ChatGateway } from './modules/chat/chat.gateway';


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
    WatchlistModule,
    PortfolioModule,
    PortfolioItemModule,
    PortfolioSnapshotModule,
    TradingAccountModule,
    OrderModule,
    PositionModule,
    MarketDepthModule,
    TechnicalIndicatorsModule
  ],
  controllers: [AppController],
  providers: [AppService, ChatGateway],
})
export class AppModule {}
