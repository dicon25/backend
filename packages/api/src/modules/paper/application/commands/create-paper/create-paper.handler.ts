import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePaperCommand } from './create-paper.command';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { PaperEntity } from '../../../domain/entities';
import { ConflictException } from '@nestjs/common';

@CommandHandler(CreatePaperCommand)
export class CreatePaperHandler implements ICommandHandler<CreatePaperCommand> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(command: CreatePaperCommand): Promise<PaperEntity> {
    // Check if paper with same DOI or paperId already exists
    const existingByDoi = await this.paperRepository.findByDoi(command.doi);
    if (existingByDoi) {
      throw new ConflictException('Paper with this DOI already exists');
    }

    const existingByPaperId = await this.paperRepository.findByPaperId(command.paperId);
    if (existingByPaperId) {
      throw new ConflictException('Paper with this Paper ID already exists');
    }

    return await this.paperRepository.create({
      paperId: command.paperId,
      title: command.title,
      categories: command.categories,
      authors: command.authors,
      summary: command.summary,
      content: command.content,
      doi: command.doi,
      pdfId: command.pdfId,
      url: command.url,
      pdfUrl: command.pdfUrl,
      issuedAt: command.issuedAt,
      thumbnailId: command.thumbnailId,
      likeCount: 0,
      unlikeCount: 0,
      totalViewCount: 0,
    } as Partial<PaperEntity>);
  }
}



