import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateInvitationDto, InvitationDto, MemberDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('housing-units/:unitId')
export class UnitInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('invitations')
  @ApiOperation({ summary: 'Invite someone to the unit by email (owner only)' })
  @ApiResponse({ status: 201, type: InvitationDto })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.invite(user.id, unitId, dto.email);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List invitations for a unit (owner only)' })
  @ApiResponse({ status: 200, type: [InvitationDto] })
  list(@CurrentUser() user: AuthUser, @Param('unitId', ParseUUIDPipe) unitId: string) {
    return this.invitations.list(user.id, unitId);
  }

  @Delete('invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an invitation (owner only)' })
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ) {
    return this.invitations.revoke(user.id, unitId, invitationId);
  }

  @Get('members')
  @ApiOperation({ summary: 'List members of a unit' })
  @ApiResponse({ status: 200, type: [MemberDto] })
  members(@CurrentUser() user: AuthUser, @Param('unitId', ParseUUIDPipe) unitId: string) {
    return this.invitations.listMembers(user.id, unitId);
  }

  @Delete('members/:memberUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from a unit (owner only)' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Param('memberUserId', ParseUUIDPipe) memberUserId: string,
  ) {
    return this.invitations.removeMember(user.id, unitId, memberUserId);
  }
}
