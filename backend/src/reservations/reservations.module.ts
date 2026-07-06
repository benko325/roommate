import { Module } from '@nestjs/common';
import { HousingUnitsModule } from '../housing-units/housing-units.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { RoomReservationsController } from './room-reservations.controller';
import { UnitReservationsController } from './unit-reservations.controller';

@Module({
  imports: [HousingUnitsModule],
  controllers: [RoomReservationsController, UnitReservationsController, ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
