import { Module } from '@nestjs/common';
import { HousingUnitsModule } from '../housing-units/housing-units.module';
import { IssuesService } from './issues.service';
import { UnitIssuesController } from './unit-issues.controller';

@Module({
  imports: [HousingUnitsModule],
  controllers: [UnitIssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
