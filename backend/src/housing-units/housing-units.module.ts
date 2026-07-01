import { Module } from '@nestjs/common';
import { HousingUnitsController } from './housing-units.controller';
import { HousingUnitsService } from './housing-units.service';

@Module({
  controllers: [HousingUnitsController],
  providers: [HousingUnitsService],
  // Exported so Rooms/Invitations/Reservations can reuse the authz helpers.
  exports: [HousingUnitsService],
})
export class HousingUnitsModule {}
