import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListPapersByCategoryQuery } from './list-papers-by-category.query';
import { PaginatedPapers, PaperRepositoryPort } from '../../../domain/repositories';

@QueryHandler(ListPapersByCategoryQuery)
export class ListPapersByCategoryHandler implements IQueryHandler<ListPapersByCategoryQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(query: ListPapersByCategoryQuery): Promise<PaginatedPapers> {
    return await this.paperRepository.findByCategory(query.category, query.options);
  }
}



