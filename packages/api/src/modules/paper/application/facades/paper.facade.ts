import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PaperEntity } from '../../domain/entities';
import { CategoryWithCount, PaginatedPapers, PaperListOptions } from '../../domain/repositories';
import {
  CreatePaperCommand,
  DeletePaperCommand,
  RecordPaperViewCommand,
  RecordPaperViewResult,
} from '../commands';
import {
  GetCategoriesQuery,
  GetHeadlinePapersQuery,
  GetLatestPapersQuery,
  GetMyDiscussedPapersQuery,
  GetMyReactedPapersQuery,
  GetMyRecommendedPapersQuery,
  GetPaperDetailHandler,
  GetPaperDetailQuery,
  GetPopularPapersQuery,
  ListPapersByCategoryQuery,
  ListPapersQuery,
} from '../queries';

@Injectable()
export class PaperFacade {
  constructor(private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus) {
  }

  async createPaper(command: CreatePaperCommand): Promise<PaperEntity> {
    return await this.commandBus.execute(command);
  }

  async deletePaper(paperId: string): Promise<void> {
    return await this.commandBus.execute(DeletePaperCommand.from({ paperId }));
  }

  async getPaperDetail(paperId: string,
    userId?: string): Promise<ReturnType<GetPaperDetailHandler['execute']>> {
    return await this.queryBus.execute(new GetPaperDetailQuery(paperId, userId));
  }

  async listPapers(options: PaperListOptions): Promise<PaginatedPapers> {
    return await this.queryBus.execute(new ListPapersQuery(options));
  }

  async getCategories(): Promise<CategoryWithCount[]> {
    return await this.queryBus.execute(new GetCategoriesQuery);
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
    return await this.commandBus.execute(RecordPaperViewCommand.from({
      paperId, userId,
    }));
  }

  async getMyReactedPapers(userId: string): Promise<any[]> {
    return await this.queryBus.execute(new GetMyReactedPapersQuery(userId));
  }

  async getMyDiscussedPapers(userId: string): Promise<any[]> {
    return await this.queryBus.execute(new GetMyDiscussedPapersQuery(userId));
  }

  async getMyRecommendedPapers(userId: string, limit: number = 20): Promise<any[]> {
    return await this.queryBus.execute(new GetMyRecommendedPapersQuery(userId, limit));
  }
}

