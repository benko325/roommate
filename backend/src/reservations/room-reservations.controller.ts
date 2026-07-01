import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReservationDto, ReservationDto } from './dto/reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId/reservations')
export class RoomReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Reserve a room (validates room rules and overlaps)' })
  @ApiResponse({ status: 201, type: ReservationDto })
  create(
    @CurrentUser() user: AuthUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservations.create(user.id, roomId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Room availability (tenants see anonymized slots)' })
  @ApiResponse({ status: 200, type: [ReservationDto] })
  list(
    @CurrentUser() user: AuthUser,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reservations.listForRoom(user.id, roomId, from, to);
  }
}
