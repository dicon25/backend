import { Prisma } from '@scholub/database';
import { DataClass } from 'dataclasses';

export class CreatePaperCommand extends DataClass {
  paperId:             string;
  title:               string;
  categories:          string[];
  authors:             string[];
  summary:             string;
  translatedSummary?:  string;
  content:             Prisma.JsonValue;
  doi:                 string;
  pdfId:               string;
  url?:                string;
  pdfUrl?:             string;
  issuedAt?:           Date;
  thumbnailId?:        string;
  hashtags?:           string[];
  translatedHashtags?: string[];
  interestedUserIds?:  string[];
}

