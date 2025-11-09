import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPopularPapersQuery } from './get-popular-papers.query';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { PaperEntity } from '../../../domain/entities';

@QueryHandler(GetPopularPapersQuery)
export class GetPopularPapersHandler implements IQueryHandler<GetPopularPapersQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(query: GetPopularPapersQuery): Promise<PaperEntity[]> {
    return await this.paperRepository.getPopularPapers(query.limit, query.days);
  }
}

