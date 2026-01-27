import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaClient } from '@aurora/db';

const prisma = new PrismaClient();

@Injectable()
export class EngineService {
  constructor(
    @InjectQueue('aurora-jobs') private readonly jobQueue: Queue,
  ) {}

  async enqueueRun(userId: string, runType: 'scoring' | 'pac' | 'full') {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Map frontend type to database status
    const statusMap: Record<string, string> = {
      'scoring': 'ETF_SCORING',
      'pac': 'MONTHLY_PAC',
      'full': 'FULL_ANALYSIS'
    };

    const run = await prisma.engineRun.create({
      data: {
        runId,
        userId,
        type: 'queued',  // execution state
        status: statusMap[runType],  // analysis type
        inputParams: {},
      } as any,
    });

    await this.jobQueue.add(
      'engine-run',
      {
        runId: run.runId,
        dbId: run.id,
        userId,
        type: runType,
      },
      {
        jobId: run.runId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return run;
  }

  async getRunStatus(runId: string) {
    const run = await (prisma.engineRun.findUnique as any)({
      where: { id: runId },
      include: {
        scoringResults: {
          include: {
            instrument: true,
          },
          orderBy: {
            totalScore: 'desc',
          },
        },
        pacProposals: {
          include: {
            proposedInstruments: {
              include: {
                instrument: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!run) {
      throw new Error('Run not found');
    }

    const job = await this.jobQueue.getJob(runId);
    const jobStatus = job ? await job.getState() : null;

    return {
      ...run,
      jobStatus,
      progress: job ? job.progress : null,
    };
  }

  async listRuns(userId: string, limit?: number) {
    return (prisma.engineRun.findMany as any)({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit || 20,
      include: {
        _count: {
          select: {
            scoringResults: true,
            pacProposals: true,
          },
        },
      },
    });
  }
}
