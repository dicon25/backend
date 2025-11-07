import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeletePaperCommand } from './delete-paper.command';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { NotFoundException } from '@nestjs/common';

@CommandHandler(DeletePaperCommand)
export class DeletePaperHandler implements ICommandHandler<DeletePaperCommand> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(command: DeletePaperCommand): Promise<void> {
    const paper = await this.paperRepository.findByPaperId(command.paperId);
    if (!paper) {
      throw new NotFoundException('Paper not found');
    }

    await this.paperRepository.delete(paper.id);
  }
}



