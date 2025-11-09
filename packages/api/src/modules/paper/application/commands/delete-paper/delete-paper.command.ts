import { DataClass } from 'dataclasses';

export class DeletePaperCommand extends DataClass {
  paperId: string;
}

