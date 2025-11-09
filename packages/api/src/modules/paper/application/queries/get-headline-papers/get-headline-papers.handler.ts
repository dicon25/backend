import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetHeadlinePapersQuery } from './get-headline-papers.query';
import { PaperRepositoryPort } from '../../../domain/repositories';
import { PaperEntity } from '../../../domain/entities';

@QueryHandler(GetHeadlinePapersQuery)
export class GetHeadlinePapersHandler implements IQueryHandler<GetHeadlinePapersQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(query: GetHeadlinePapersQuery): Promise<PaperEntity[]> {
    return await this.paperRepository.getHeadlinePapers(query.limit);
  }
}

