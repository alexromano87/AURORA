import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { EngineService } from './engine.service';

@ApiTags('engine')
@Controller('api/engine')
export class EngineController {
  constructor(private readonly engineService: EngineService) {}

  @Post('run')
  @ApiOperation({ summary: 'Enqueue engine run' })
  async enqueueRun(
    @Body() body: { userId: string; type: 'scoring' | 'pac' | 'full' },
  ) {
    return this.engineService.enqueueRun(body.userId, body.type);
  }

  @Get('runs/:runId')
  @ApiOperation({ summary: 'Get engine run status and results' })
  async getRunStatus(@Param('runId') runId: string) {
    return this.engineService.getRunStatus(runId);
  }

  @Get('runs')
  @ApiOperation({ summary: 'List engine runs for user' })
  async listRuns(
    @Query('userId') userId: string,
    @Query('limit') limit: number = 20,
  ) {
    return this.engineService.listRuns(userId, limit);
  }
}
