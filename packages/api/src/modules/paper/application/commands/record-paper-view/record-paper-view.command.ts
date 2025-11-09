import { DataClass } from 'dataclasses';

export class RecordPaperViewCommand extends DataClass {
  paperId: string;
  userId?: string;
}

