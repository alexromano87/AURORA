import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@aurora/db';
import type { IpsConfig } from '@aurora/types';

@Injectable()
export class IpsService {
  /**
   * Get IPS Policy for user
   */
  async getIpsPolicy(userId: string) {
    const policy = await prisma.ipsPolicy.findUnique({
      where: { userId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`IPS Policy not found for user: ${userId}`);
    }

    return policy;
  }

  /**
   * Get active IPS version
   */
  async getActiveVersion(userId: string) {
    const policy = await prisma.ipsPolicy.findUnique({
      where: { userId },
      include: {
        versions: {
          where: { isActive: true },
        },
      },
    });

    if (!policy || !policy.versions.length) {
      throw new NotFoundException(`No active IPS version for user: ${userId}`);
    }

    return policy.versions[0];
  }

  /**
   * Create new IPS Policy with initial version
   */
  async createIpsPolicy(userId: string, config: IpsConfig) {
    // Check if policy already exists
    const existing = await prisma.ipsPolicy.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new BadRequestException(`IPS Policy already exists for user: ${userId}`);
    }

    const policy = await prisma.ipsPolicy.create({
      data: {
        userId,
        versions: {
          create: {
            version: config.version,
            config: config as any,
            isActive: true,
            activatedAt: new Date(),
          },
        },
      },
      include: {
        versions: true,
      },
    });

    return policy;
  }

  /**
   * Create new IPS version
   */
  async createVersion(userId: string, config: IpsConfig) {
    const policy = await prisma.ipsPolicy.findUnique({
      where: { userId },
    });

    if (!policy) {
      throw new NotFoundException(`IPS Policy not found for user: ${userId}`);
    }

    // Check if version already exists
    const existingVersion = await prisma.ipsPolicyVersion.findUnique({
      where: {
        policyId_version: {
          policyId: policy.id,
          version: config.version,
        },
      },
    });

    if (existingVersion) {
      throw new BadRequestException(`Version ${config.version} already exists`);
    }

    const version = await prisma.ipsPolicyVersion.create({
      data: {
        policyId: policy.id,
        version: config.version,
        config: config as any,
        isActive: false,
      },
    });

    return version;
  }

  /**
   * Activate specific version
   */
  async activateVersion(userId: string, versionId: string) {
    const policy = await prisma.ipsPolicy.findUnique({
      where: { userId },
    });

    if (!policy) {
      throw new NotFoundException(`IPS Policy not found for user: ${userId}`);
    }

    const version = await prisma.ipsPolicyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.policyId !== policy.id) {
      throw new NotFoundException(`Version not found: ${versionId}`);
    }

    // Deactivate all versions
    await prisma.ipsPolicyVersion.updateMany({
      where: { policyId: policy.id },
      data: { isActive: false },
    });

    // Activate target version
    const activated = await prisma.ipsPolicyVersion.update({
      where: { id: versionId },
      data: {
        isActive: true,
        activatedAt: new Date(),
      },
    });

    return activated;
  }

  /**
   * List all versions
   */
  async listVersions(userId: string) {
    const policy = await prisma.ipsPolicy.findUnique({
      where: { userId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`IPS Policy not found for user: ${userId}`);
    }

    return policy.versions;
  }

  /**
   * Update version
   */
  async updateVersion(versionId: string, config: IpsConfig) {
    const version = await prisma.ipsPolicyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Version not found: ${versionId}`);
    }

    const updated = await prisma.ipsPolicyVersion.update({
      where: { id: versionId },
      data: {
        config: config as any,
      },
    });

    return updated;
  }

  /**
   * Delete version
   */
  async deleteVersion(versionId: string) {
    const version = await prisma.ipsPolicyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new NotFoundException(`Version not found: ${versionId}`);
    }

    if (version.isActive) {
      throw new BadRequestException('Cannot delete active version');
    }

    await prisma.ipsPolicyVersion.delete({
      where: { id: versionId },
    });

    return { success: true };
  }
}
