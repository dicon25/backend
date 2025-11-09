import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@/common/modules/prisma';
import { ReactionType } from '../../../domain/entities';
import { ReactionRepositoryPort } from '../../../domain/repositories';
import { ToggleReactionCommand } from './toggle-reaction.command';

@CommandHandler(ToggleReactionCommand)
export class ToggleReactionHandler implements ICommandHandler<ToggleReactionCommand> {
  constructor(private readonly reactionRepository: ReactionRepositoryPort,
    private readonly prisma: PrismaService) {
  }

  async execute(command: ToggleReactionCommand): Promise<{
    action: 'created' | 'deleted';
  }> {
    return await this.prisma.$transaction(async tx => {
      // Check if the same reaction exists
      const existingReaction = await this.reactionRepository.findByUserAndPaper(command.userId,
        command.paperId,
        command.type);

      if (existingReaction) {
        // Delete existing reaction (toggle off)
        await this.reactionRepository.delete(existingReaction.id);

        // Update paper count
        const field = command.type === ReactionType.LIKE ? 'likeCount' : 'unlikeCount';

        await tx.paper.update({
          where: { id: command.paperId },
          data:  { [field]: { decrement: 1 } },
        });

        return { action: 'deleted' };
      }

      // Check if opposite reaction exists
      const oppositeType = command.type === ReactionType.LIKE ? ReactionType.UNLIKE : ReactionType.LIKE;

      const oppositeReaction = await this.reactionRepository.findByUserAndPaper(command.userId,
        command.paperId,
        oppositeType);

      if (oppositeReaction) {
        // Delete opposite reaction
        await this.reactionRepository.delete(oppositeReaction.id);

        // Decrement opposite count
        const oppositeField = oppositeType === ReactionType.LIKE ? 'likeCount' : 'unlikeCount';

        await tx.paper.update({
          where: { id: command.paperId },
          data:  { [oppositeField]: { decrement: 1 } },
        });
      }

      // Create new reaction
      await this.reactionRepository.create(command.userId, command.paperId, command.type);

      // Increment count
      const field = command.type === ReactionType.LIKE ? 'likeCount' : 'unlikeCount';

      await tx.paper.update({
        where: { id: command.paperId },
        data:  { [field]: { increment: 1 } },
      });

      // Create user activity
      await tx.userActivity.create({ data: {
        userId:  command.userId,
        paperId: command.paperId,
        type:    'REACT',
      } });

      return { action: 'created' };
    });
  }
}

