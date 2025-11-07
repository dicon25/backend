import { PaperEntity } from '../entities';
import { PaperSortBy, SortOrder } from '../enums';

export interface PaperFilters {
  categories?: string[];
  authors?: string[];
  year?: number;
  searchQuery?: string;
}

export interface PaperListOptions {
  page: number;
  limit: number;
  sortBy?: PaperSortBy;
  sortOrder?: SortOrder;
  filters?: PaperFilters;
}

export interface PaginatedPapers {
  papers: PaperEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategoryWithCount {
  category: string;
  count: number;
}

export abstract class PaperRepositoryPort {
  abstract create(paper: Partial<PaperEntity>): Promise<PaperEntity>;
  abstract findById(id: string): Promise<PaperEntity | null>;
  abstract findByPaperId(paperId: string): Promise<PaperEntity | null>;
  abstract findByDoi(doi: string): Promise<PaperEntity | null>;
  abstract list(options: PaperListOptions): Promise<PaginatedPapers>;
  abstract update(id: string, data: Partial<PaperEntity>): Promise<PaperEntity>;
  abstract delete(id: string): Promise<void>;
  abstract incrementViewCount(id: string): Promise<void>;
  abstract getCategories(): Promise<CategoryWithCount[]>;
  abstract findByCategory(category: string, options: PaperListOptions): Promise<PaginatedPapers>;
}



