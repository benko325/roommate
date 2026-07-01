import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationLookupDto, TokenDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Look up an invitation by token (public)' })
  @ApiResponse({ status: 200, type: InvitationLookupDto })
  lookup(@Query('token') token: string) {
    return this.invitations.lookup(token);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation (must be signed in as the invited email)' })
  accept(@CurrentUser() user: AuthUser, @Body() dto: TokenDto) {
    return this.invitations.accept(user.id, user.email, dto.token);
  }

  @Post('reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reject an invitation' })
  reject(@CurrentUser() user: AuthUser, @Body() dto: TokenDto) {
    return this.invitations.reject(user.email, dto.token);
  }
}
