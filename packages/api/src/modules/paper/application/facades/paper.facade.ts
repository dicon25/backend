import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreatePaperCommand, DeletePaperCommand } from '../commands';
import {
  GetCategoriesQuery,
  GetPaperDetailHandler,
  GetPaperDetailQuery,
  ListPapersByCategoryQuery,
  ListPapersQuery,
} from '../queries';
import { PaperEntity } from '../../domain/entities';
import { CategoryWithCount, PaginatedPapers, PaperListOptions } from '../../domain/repositories';

@Injectable()
export class PaperFacade {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async createPaper(command: CreatePaperCommand): Promise<PaperEntity> {
    return await this.commandBus.execute(command);
  }

  async deletePaper(paperId: string): Promise<void> {
    return await this.commandBus.execute(new DeletePaperCommand(paperId));
  }

  async getPaperDetail(
    paperId: string,
    userId?: string,
  ): Promise<ReturnType<GetPaperDetailHandler['execute']>> {
    return await this.queryBus.execute(new GetPaperDetailQuery(paperId, userId));
  }

  async listPapers(options: PaperListOptions): Promise<PaginatedPapers> {
    return await this.queryBus.execute(new ListPapersQuery(options));
  }

  async getCategories(): Promise<CategoryWithCount[]> {
    return await this.queryBus.execute(new GetCategoriesQuery());
  }

  async listPapersByCategory(category: string, options: PaperListOptions): Promise<PaginatedPapers> {
    return await this.queryBus.execute(new ListPapersByCategoryQuery(category, options));
  }
}



