import { Module } from '@nestjs/common';
import { HousingUnitsModule } from '../housing-units/housing-units.module';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';

@Module({
  imports: [HousingUnitsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
