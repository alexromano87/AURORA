import { Module } from '@nestjs/common';
import { IpsController } from './ips.controller';
import { IpsService } from './ips.service';

@Module({
  controllers: [IpsController],
  providers: [IpsService],
  exports: [IpsService],
})
export class IpsModule {}
