import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePaperCommand } from './delete-paper.command';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { NotFoundException } from '@nestjs/common';
import { PaperSyncService } from '../../../infrastructure/search/elasticsearch';

@CommandHandler(DeletePaperCommand)
export class DeletePaperHandler implements ICommandHandler<DeletePaperCommand> {
  constructor(
    private readonly paperRepository: PaperRepositoryPort,
    private readonly paperSyncService: PaperSyncService,
  ) {}

  async execute(command: DeletePaperCommand): Promise<void> {
    const paper = await this.paperRepository.findByPaperId(command.paperId);
    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    await this.paperRepository.delete(paper.id);

    // Delete from Elasticsearch
    try {
      await this.paperSyncService.deletePaper(paper.id);
    } catch (error) {
      // Don't throw - allow the operation to continue even if deletion fails
    }
  }
}



