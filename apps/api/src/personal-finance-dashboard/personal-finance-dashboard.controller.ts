import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PersonalFinanceDashboardService } from './personal-finance-dashboard.service';

@ApiTags('personal-finance')
@Controller('api/personal-finance')
export class PersonalFinanceDashboardController {
  constructor(
    private readonly dashboardService: PersonalFinanceDashboardService,
  ) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get personal finance KPIs' })
  async getKPIs(
    @Query('userId') userId: string = 'user_default',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getKPIs(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('balance-trend')
  @ApiOperation({ summary: 'Get balance trend over time' })
  async getBalanceTrend(
    @Query('userId') userId: string = 'user_default',
    @Query('days') days: string = '30',
  ) {
    return this.dashboardService.getBalanceTrend(userId, parseInt(days, 10));
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: 'Get expense breakdown by category' })
  async getCategoryBreakdown(
    @Query('userId') userId: string = 'user_default',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getCategoryBreakdown(
      userId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('income-vs-expenses')
  @ApiOperation({ summary: 'Get monthly income vs expenses comparison' })
  async getIncomeVsExpenses(
    @Query('userId') userId: string = 'user_default',
    @Query('months') months: string = '6',
  ) {
    return this.dashboardService.getIncomeVsExpenses(userId, parseInt(months, 10));
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get active spending alerts' })
  async getAlerts(@Query('userId') userId: string = 'user_default') {
    return this.dashboardService.getActiveAlerts(userId);
  }

  @Post('alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge a spending alert' })
  async acknowledgeAlert(@Param('id') id: string) {
    return this.dashboardService.acknowledgeAlert(id);
  }
}
