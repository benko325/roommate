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
import { CreateRoomDto, RoomDto, UpdateRoomDto } from './dto/room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('housing-units/:unitId/rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a room in a unit (owner only)' })
  @ApiResponse({ status: 201, type: RoomDto })
  create(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: CreateRoomDto,
  ) {
    return this.rooms.create(user.id, unitId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rooms in a unit' })
  @ApiResponse({ status: 200, type: [RoomDto] })
  findAll(@CurrentUser() user: AuthUser, @Param('unitId', ParseUUIDPipe) unitId: string) {
    return this.rooms.findAll(user.id, unitId);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get a room' })
  @ApiResponse({ status: 200, type: RoomDto })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.rooms.findOne(user.id, unitId, roomId);
  }

  @Patch(':roomId')
  @ApiOperation({ summary: 'Update a room (owner only)' })
  @ApiResponse({ status: 200, type: RoomDto })
  update(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.rooms.update(user.id, unitId, roomId, dto);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room (owner only)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Param('roomId', ParseUUIDPipe) roomId: string,
  ) {
    return this.rooms.remove(user.id, unitId, roomId);
  }
}
