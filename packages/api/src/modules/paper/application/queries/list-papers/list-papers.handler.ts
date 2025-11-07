import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListPapersQuery } from './list-papers.query';
import { PaginatedPapers, PaperRepositoryPort } from '../../../domain/repositories';

@QueryHandler(ListPapersQuery)
export class ListPapersHandler implements IQueryHandler<ListPapersQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(query: ListPapersQuery): Promise<PaginatedPapers> {
    return await this.paperRepository.list(query.options);
  }
}



