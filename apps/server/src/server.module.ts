import { Module } from '@nestjs/common';
import { UserModule } from 'apps/server/src/user/user.module';

@Module({
  imports: [UserModule],
  controllers: [],
  providers: [],
})
export class ServerModule {}
