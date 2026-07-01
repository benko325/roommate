import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import {
  AdminReservationDto,
  AdminStatsDto,
  AdminUnitDto,
  AdminUserDto,
  UpdateRoleDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'System-wide counts' })
  @ApiResponse({ status: 200, type: AdminStatsDto })
  stats() {
    return this.admin.stats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, type: [AdminUserDto] })
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Change a user's system role" })
  setRole(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.admin.setUserRole(actor.id, id, dto.systemRole);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (must not own households)' })
  deleteUser(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteUser(actor.id, id);
  }

  @Get('housing-units')
  @ApiOperation({ summary: 'List all housing units' })
  @ApiResponse({ status: 200, type: [AdminUnitDto] })
  units() {
    return this.admin.listUnits();
  }

  @Delete('housing-units/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete any housing unit' })
  deleteUnit(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteUnit(id);
  }

  @Get('reservations')
  @ApiOperation({ summary: 'List recent reservations (all units)' })
  @ApiResponse({ status: 200, type: [AdminReservationDto] })
  reservations() {
    return this.admin.listReservations();
  }

  @Delete('reservations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete any reservation' })
  deleteReservation(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteReservation(id);
  }
}
