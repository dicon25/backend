import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CategoryWithCount, PaperRepositoryPort } from '../../../domain/repositories';
import { GetCategoriesQuery } from './get-categories.query';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {
  }

  async execute(): Promise<CategoryWithCount[]> {
    return await this.paperRepository.getCategories();
  }
}

