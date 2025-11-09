import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreatePaperCommand, DeletePaperCommand, RecordPaperViewCommand, RecordPaperViewResult } from '../commands';
import {
  GetCategoriesQuery,
  GetPaperDetailHandler,
  GetPaperDetailQuery,
  ListPapersByCategoryQuery,
  ListPapersQuery,
  GetHeadlinePapersQuery,
  GetPopularPapersQuery,
  GetLatestPapersQuery,
  GetMyReactedPapersQuery,
  GetMyDiscussedPapersQuery,
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

  async getHeadlinePapers(limit: number = 4): Promise<PaperEntity[]> {
    return await this.queryBus.execute(new GetHeadlinePapersQuery(limit));
  }

  async getPopularPapers(limit: number = 20, days: number = 90): Promise<PaperEntity[]> {
    return await this.queryBus.execute(new GetPopularPapersQuery(limit, days));
  }

  async getLatestPapers(limit: number = 20): Promise<PaperEntity[]> {
    return await this.queryBus.execute(new GetLatestPapersQuery(limit));
  }

  async recordPaperView(paperId: string, userId?: string): Promise<RecordPaperViewResult> {
    return await this.commandBus.execute(new RecordPaperViewCommand(paperId, userId));
  }

  async getMyReactedPapers(userId: string): Promise<any[]> {
    return await this.queryBus.execute(new GetMyReactedPapersQuery(userId));
  }

  async getMyDiscussedPapers(userId: string): Promise<any[]> {
    return await this.queryBus.execute(new GetMyDiscussedPapersQuery(userId));
  }
}



