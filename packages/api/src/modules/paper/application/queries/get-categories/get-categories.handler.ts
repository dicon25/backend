import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCategoriesQuery } from './get-categories.query';
import { CategoryWithCount, PaperRepositoryPort } from '../../../domain/repositories';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery> {
  constructor(private readonly paperRepository: PaperRepositoryPort) {}

  async execute(): Promise<CategoryWithCount[]> {
    return await this.paperRepository.getCategories();
  }
}



