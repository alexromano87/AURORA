import { Controller, Post, Param, Query, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { PricesSchedulerService } from './prices-scheduler.service';

@ApiTags('prices')
@Controller('api/prices')
export class PricesController {
  constructor(
    private readonly pricesService: PricesService,
    private readonly schedulerService: PricesSchedulerService,
  ) {}

  @Post('instrument/:instrumentId')
  @ApiOperation({ summary: 'Fetch prices for a specific instrument' })
  async fetchPricesForInstrument(
    @Param('instrumentId') instrumentId: string,
    @Query('days') days?: number,
  ) {
    return this.pricesService.fetchPricesForInstrument(
      instrumentId,
      days ? parseInt(days.toString()) : 365,
    );
  }

  @Post('update-all')
  @ApiOperation({ summary: 'Update prices for all instruments' })
  async updateAllPrices(@Query('days') days?: number) {
    return this.pricesService.updateAllPrices(
      days ? parseInt(days.toString()) : 365,
    );
  }

  @Get('instrument/:instrumentId/latest')
  @ApiOperation({ summary: 'Get latest price for an instrument' })
  async getLatestPrice(@Param('instrumentId') instrumentId: string) {
    const price = await this.pricesService.getLatestPrice(instrumentId);
    return { instrumentId, price };
  }

  @Post('isin-mapping')
  @ApiOperation({ summary: 'Create or update ISIN to Yahoo ticker mapping' })
  async upsertIsinMapping(
    @Query('isin') isin: string,
    @Query('yahooTicker') yahooTicker: string,
    @Query('exchange') exchange?: string,
  ) {
    await this.pricesService.upsertIsinMapping(isin, yahooTicker, exchange);
    return { success: true };
  }

  @Post('queue/update-all')
  @ApiOperation({ summary: 'Queue update for all instruments (async)' })
  async queueUpdateAll(@Query('days') days?: number) {
    return this.schedulerService.queueAllPricesUpdate(
      days ? parseInt(days.toString()) : 365,
    );
  }

  @Post('queue/instrument/:instrumentId')
  @ApiOperation({ summary: 'Queue update for specific instrument (async)' })
  async queueUpdateInstrument(
    @Param('instrumentId') instrumentId: string,
    @Query('days') days?: number,
  ) {
    return this.schedulerService.queueInstrumentPricesUpdate(
      instrumentId,
      days ? parseInt(days.toString()) : 365,
    );
  }

  @Get('jobs/status')
  @ApiOperation({ summary: 'Get price update jobs status' })
  async getJobsStatus() {
    return this.schedulerService.getJobsStatus();
  }
}
