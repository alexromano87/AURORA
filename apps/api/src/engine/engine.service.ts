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

  async enqueueRun(userId: string, type: 'scoring' | 'pac' | 'full') {
    const run = await prisma.engineRun.create({
      data: {
        userId,
        type,
        status: 'QUEUED',
      } as any,
    });

    await this.jobQueue.add(
      'engine-run',
      {
        runId: run.id,
        userId,
        type,
      },
      {
        jobId: run.id,
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
