import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { PaperSyncService } from '../../../infrastructure/search/meilisearch';
import { DeletePaperCommand } from './delete-paper.command';

@CommandHandler(DeletePaperCommand)
export class DeletePaperHandler implements ICommandHandler<DeletePaperCommand> {
  constructor(private readonly paperRepository: PaperRepositoryPort,
    private readonly paperSyncService: PaperSyncService) {
  }

  async execute(command: DeletePaperCommand): Promise<void> {
    const paper = await this.paperRepository.findById(command.paperId);

    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    await this.paperRepository.delete(paper.id);

    // Delete from MeiliSearch
    try {
      await this.paperSyncService.deletePaper(paper.id);
    } catch (error) {
      // Don't throw - allow the operation to continue even if deletion fails
    }
  }
}

