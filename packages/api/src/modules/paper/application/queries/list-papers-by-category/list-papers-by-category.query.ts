import { PaperListOptions } from '../../../domain/repositories';

export class ListPapersByCategoryQuery {
  constructor(public readonly category: string,
    public readonly options: PaperListOptions) {
  }
}

