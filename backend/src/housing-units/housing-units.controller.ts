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
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateHousingUnitDto,
  HousingUnitDto,
  UpdateHousingUnitDto,
} from './dto/housing-unit.dto';
import { HousingUnitsService } from './housing-units.service';

@ApiTags('housing-units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('housing-units')
export class HousingUnitsController {
  constructor(private readonly units: HousingUnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a housing unit (you become its owner)' })
  @ApiResponse({ status: 201, type: HousingUnitDto })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHousingUnitDto) {
    return this.units.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List housing units you own or belong to' })
  @ApiResponse({ status: 200, type: [HousingUnitDto] })
  findAll(@CurrentUser() user: AuthUser) {
    return this.units.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a housing unit you own or belong to' })
  @ApiResponse({ status: 200, type: HousingUnitDto })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.units.findOneForUser(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a housing unit (owner only)' })
  @ApiResponse({ status: 200, type: HousingUnitDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHousingUnitDto,
  ) {
    return this.units.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a housing unit (owner only)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.units.remove(user.id, id);
  }
}
