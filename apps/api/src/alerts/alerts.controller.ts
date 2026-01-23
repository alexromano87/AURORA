import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';

@ApiTags('alerts')
@Controller('api/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List alerts for user' })
  async listAlerts(
    @Query('userId') userId: string,
    @Query('acknowledged') acknowledged?: string,
  ) {
    const ack = acknowledged === 'true' ? true : acknowledged === 'false' ? false : undefined;
    return this.alertsService.listAlerts(userId, ack);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert details' })
  async getAlert(@Param('id') id: string) {
    return this.alertsService.getAlert(id);
  }

  @Post(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss alert' })
  async dismissAlert(@Param('id') id: string) {
    return this.alertsService.dismissAlert(id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve alert' })
  async resolveAlert(@Param('id') id: string) {
    return this.alertsService.resolveAlert(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create manual alert' })
  async createAlert(
    @Body()
    body: {
      userId: string;
      portfolioId: string;
      type: string;
      priority: string;
      title: string;
      message: string;
      data?: any;
    },
  ) {
    return this.alertsService.createAlert(
      body.userId,
      body.portfolioId,
      body.type,
      body.priority,
      body.title,
      body.message,
      body.data,
    );
  }
}
