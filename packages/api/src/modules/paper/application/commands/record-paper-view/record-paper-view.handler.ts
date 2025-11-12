import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/common/modules/prisma';
import { RecordPaperViewCommand } from './record-paper-view.command';

export interface RecordPaperViewResult {
  success:     boolean;
  paperViewId: string;
}

@CommandHandler(RecordPaperViewCommand)
export class RecordPaperViewHandler implements ICommandHandler<RecordPaperViewCommand> {
  constructor(private readonly prisma: PrismaService) {
  }

  async execute(command: RecordPaperViewCommand): Promise<RecordPaperViewResult> {
    // Check if paper exists
    const paper = await this.prisma.paper.findUnique({ where: { id: command.paperId } });

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    // Create paper view
    const paperView = await this.prisma.paperView.create({ data: {
      paperId: paper.id,
      userId:  command.userId,
    } });

    // Increment paper view count
    await this.prisma.paper.update({
      where: { id: paper.id },
      data:  { totalViewCount: { increment: 1 } },
    });

    // Create user activity for staying long time (only if userId is provided)
    if (command.userId) {
      await this.prisma.userActivity.create({ data: {
        userId:  command.userId,
        paperId: paper.id,
        type:    'STAY_LONG_TIME',
      } });
    }

    return {
      success:     true,
      paperViewId: paperView.id,
    };
  }
}

