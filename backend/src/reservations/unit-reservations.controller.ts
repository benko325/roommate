import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('housing-units/:unitId/reservations')
export class UnitReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  @ApiOperation({ summary: 'All reservations in a unit with authors (owner only)' })
  @ApiResponse({ status: 200, type: [ReservationDto] })
  list(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Query('roomId') roomId?: string,
    @Query('userId') filterUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reservations.listForUnit(user.id, unitId, {
      roomId,
      userId: filterUserId,
      from,
      to,
    });
  }
}
