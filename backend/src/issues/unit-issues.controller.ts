import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateIssueDto, IssueDto } from './dto/issue.dto';
import { IssuesService } from './issues.service';

@ApiTags('issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('housing-units/:unitId/issues')
export class UnitIssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Post()
  @ApiOperation({
    summary: 'Report an issue to the unit owner (member or owner)',
  })
  @ApiResponse({ status: 201, type: IssueDto })
  create(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Body() dto: CreateIssueDto,
  ) {
    return this.issues.create(user.id, unitId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List issues (owner sees all, member sees own)' })
  @ApiResponse({ status: 200, type: [IssueDto] })
  list(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
  ) {
    return this.issues.list(user.id, unitId);
  }

  @Post(':issueId/resolve')
  @ApiOperation({ summary: 'Mark an issue as resolved (owner only)' })
  @ApiResponse({ status: 201, type: IssueDto })
  resolve(
    @CurrentUser() user: AuthUser,
    @Param('unitId', ParseUUIDPipe) unitId: string,
    @Param('issueId', ParseUUIDPipe) issueId: string,
  ) {
    return this.issues.resolve(user.id, unitId, issueId);
  }
}
