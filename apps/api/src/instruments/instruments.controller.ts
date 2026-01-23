import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstrumentsService } from './instruments.service';

@ApiTags('instruments')
@Controller('api/instruments')
export class InstrumentsController {
  constructor(private readonly instrumentsService: InstrumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List instruments' })
  async listInstruments(
    @Query('type') type?: 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH',
    @Query('limit') limit: number = 100,
  ) {
    return this.instrumentsService.listInstruments(type, limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search instruments' })
  async searchInstruments(
    @Query('q') query: string,
    @Query('type') type?: string,
  ) {
    return this.instrumentsService.searchInstruments(query, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get instrument details' })
  async getInstrument(@Param('id') id: string) {
    return this.instrumentsService.getInstrument(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create instrument' })
  async createInstrument(
    @Body()
    body: {
      ticker: string;
      name: string;
      type: 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH';
      isin?: string;
      currency?: string;
      metadata?: any;
    },
  ) {
    return this.instrumentsService.createInstrument(body);
  }

  @Post(':id/prices')
  @ApiOperation({ summary: 'Update price history' })
  async updatePriceHistory(
    @Param('id') id: string,
    @Body()
    body: {
      prices: Array<{
        date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }>;
    },
  ) {
    const prices = body.prices.map((p) => ({
      ...p,
      date: new Date(p.date),
    }));
    return this.instrumentsService.updatePriceHistory(id, prices);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update instrument' })
  async updateInstrument(
    @Param('id') id: string,
    @Body()
    body: {
      ticker: string;
      name: string;
      type: 'ETF' | 'STOCK' | 'BOND' | 'CRYPTO' | 'CASH';
      isin?: string;
      currency?: string;
    },
  ) {
    return this.instrumentsService.updateInstrument(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete instrument' })
  async deleteInstrument(@Param('id') id: string) {
    return this.instrumentsService.deleteInstrument(id);
  }
}
