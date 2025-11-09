import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaperEntity } from '@/modules/paper/domain/entities';
import { PaperRepositoryPort } from '@/modules/paper/domain/repositories';
import { GetLatestPapersQuery } from './get-latest-papers.query';

@QueryHandler(GetLatestPapersQuery)
export class GetLatestPapersHandler implements IQueryHandler<GetLatestPapersQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {
  }

  async execute(query: GetLatestPapersQuery): Promise<PaperEntity[]> {
    return await this.paperRepository.getLatestPapers(query.limit);
  }
}

