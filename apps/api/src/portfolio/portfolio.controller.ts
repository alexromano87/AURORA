import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolios')
@Controller('api/portfolios')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'List all portfolios for user' })
  async listPortfolios(@Query('userId') userId: string = 'user_default') {
    return this.portfolioService.listPortfolios(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get portfolio details' })
  async getPortfolio(@Param('id') id: string) {
    return this.portfolioService.getPortfolio(id);
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get portfolio snapshots' })
  async getSnapshots(
    @Param('id') id: string,
    @Query('limit') limit: number = 30,
  ) {
    return this.portfolioService.getSnapshots(id, limit);
  }

  @Post()
  @ApiOperation({ summary: 'Create new portfolio' })
  async createPortfolio(
    @Body() body: { userId?: string; name: string; type?: string },
  ) {
    const userId = body.userId || 'user_default';
    return this.portfolioService.createPortfolio(userId, body.name, body.type);
  }

  @Post(':id/snapshots')
  @ApiOperation({ summary: 'Create snapshot' })
  async createSnapshot(@Param('id') id: string) {
    return this.portfolioService.createSnapshot(id);
  }
}
