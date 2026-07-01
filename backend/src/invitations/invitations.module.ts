import { Module } from '@nestjs/common';
import { HousingUnitsModule } from '../housing-units/housing-units.module';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { UnitInvitationsController } from './unit-invitations.controller';

@Module({
  imports: [HousingUnitsModule],
  controllers: [UnitInvitationsController, InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
