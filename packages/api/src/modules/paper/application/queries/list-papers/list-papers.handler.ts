import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedPapers, PaperRepositoryPort } from '../../../domain/repositories';
import { ListPapersQuery } from './list-papers.query';

@QueryHandler(ListPapersQuery)
export class ListPapersHandler implements IQueryHandler<ListPapersQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {
  }

  async execute(query: ListPapersQuery): Promise<PaginatedPapers> {
    return await this.paperRepository.list(query.options);
  }
}

