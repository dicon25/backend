import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaperEntity } from '../../../domain/entities';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { GetPopularPapersQuery } from './get-popular-papers.query';

@QueryHandler(GetPopularPapersQuery)
export class GetPopularPapersHandler implements IQueryHandler<GetPopularPapersQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {
  }

  async execute(query: GetPopularPapersQuery): Promise<PaperEntity[]> {
    return await this.paperRepository.getPopularPapers(query.limit, query.days);
  }
}

