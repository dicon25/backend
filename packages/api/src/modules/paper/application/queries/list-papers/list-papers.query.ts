import { PaperListOptions } from '../../../domain/repositories';

export class ListPapersQuery {
  constructor(public readonly options: PaperListOptions) {}
}



