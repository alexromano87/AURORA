import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IpsService } from './ips.service';
import type { IpsConfig } from '@aurora/types';

@ApiTags('ips')
@Controller('api/ips')
export class IpsController {
  constructor(private readonly ipsService: IpsService) {}

  @Get()
  @ApiOperation({ summary: 'Get IPS Policy for user' })
  @ApiResponse({ status: 200, description: 'IPS Policy retrieved successfully' })
  @ApiResponse({ status: 404, description: 'IPS Policy not found' })
  async getIpsPolicy(@Query('userId') userId: string = 'user_default') {
    return this.ipsService.getIpsPolicy(userId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active IPS version' })
  @ApiResponse({ status: 200, description: 'Active version retrieved' })
  @ApiResponse({ status: 404, description: 'No active version found' })
  async getActiveVersion(@Query('userId') userId: string = 'user_default') {
    return this.ipsService.getActiveVersion(userId);
  }

  @Get('versions')
  @ApiOperation({ summary: 'List all IPS versions' })
  @ApiResponse({ status: 200, description: 'Versions list retrieved' })
  async listVersions(@Query('userId') userId: string = 'user_default') {
    return this.ipsService.listVersions(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new IPS Policy' })
  @ApiResponse({ status: 201, description: 'IPS Policy created successfully' })
  @ApiResponse({ status: 400, description: 'Policy already exists' })
  async createIpsPolicy(
    @Body() body: { userId?: string; config: IpsConfig },
  ) {
    const userId = body.userId || 'user_default';
    return this.ipsService.createIpsPolicy(userId, body.config);
  }

  @Post('versions')
  @ApiOperation({ summary: 'Create new IPS version' })
  @ApiResponse({ status: 201, description: 'Version created successfully' })
  @ApiResponse({ status: 400, description: 'Version already exists' })
  async createVersion(
    @Body() body: { userId?: string; config: IpsConfig },
  ) {
    const userId = body.userId || 'user_default';
    return this.ipsService.createVersion(userId, body.config);
  }

  @Post('activate/:versionId')
  @ApiOperation({ summary: 'Activate specific IPS version' })
  @ApiResponse({ status: 200, description: 'Version activated successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async activateVersion(
    @Param('versionId') versionId: string,
    @Query('userId') userId: string = 'user_default',
  ) {
    return this.ipsService.activateVersion(userId, versionId);
  }
}
