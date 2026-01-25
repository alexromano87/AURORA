import { Controller, Post, Param, Query, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricesService } from './prices.service';
import { FinnhubService } from './finnhub.service';
import { YahooFinanceService } from './yahoo.service';
import { PricesSchedulerService } from './prices-scheduler.service';
import { PriceQueueService } from './price-queue.service';

@ApiTags('prices')
@Controller('api/prices')
export class PricesController {
  constructor(
    private readonly pricesService: PricesService,
    private readonly finnhubService: FinnhubService,
    private readonly yahooService: YahooFinanceService,
    private readonly schedulerService: PricesSchedulerService,
    private readonly queueService: PriceQueueService,
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
    return this.pricesService.getLatestPrice(instrumentId);
  }

  @Get('instrument/:instrumentId/history')
  @ApiOperation({ summary: 'Get price history for an instrument' })
  async getPriceHistory(
    @Param('instrumentId') instrumentId: string,
    @Query('days') days?: number,
  ) {
    return this.pricesService.getPriceHistory(
      instrumentId,
      days ? parseInt(days.toString()) : 365,
    );
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

  @Post('finnhub/instrument/:instrumentId')
  @ApiOperation({ summary: 'Fetch current price using Finnhub API (real-time)' })
  async fetchCurrentPriceFromFinnhub(
    @Param('instrumentId') instrumentId: string,
  ) {
    return this.finnhubService.fetchCurrentPriceForInstrument(instrumentId);
  }

  @Post('yahoo/instrument/:instrumentId')
  @ApiOperation({ summary: 'Fetch current price using Yahoo Finance API (via queue to avoid rate limiting)' })
  async fetchCurrentPriceFromYahoo(
    @Param('instrumentId') instrumentId: string,
  ) {
    return this.queueService.queuePriceFetch(instrumentId);
  }

  @Get('queue/status')
  @ApiOperation({ summary: 'Get price fetch queue status' })
  async getQueueStatus() {
    return this.queueService.getQueueStatus();
  }

  @Get('yahoo/search/:query')
  @ApiOperation({ summary: 'Search instruments on Yahoo Finance by ISIN or ticker' })
  async searchYahooSymbols(@Param('query') query: string) {
    return this.yahooService.searchSymbols(query);
  }
}
