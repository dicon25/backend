import { Prisma } from '@scholub/database';

export class PaperEntity {
  id:                 string;
  paperId:            string;
  title:              string;
  categories:         string[];
  authors:            string[];
  summary:            string;
  translatedSummary?: string;
  content:            Prisma.JsonValue;
  hashtags:           string[];
  doi:                string;
  url?:               string;
  pdfUrl?:            string;
  issuedAt?:          Date;
  likeCount:          number;
  unlikeCount:        number;
  totalViewCount:     number;
  thumbnailId?:       string;
  pdfId:              string;
  createdAt:          Date;
  updatedAt:          Date;

  constructor(data: PaperEntity) {
    Object.assign(this, data);
  }
}

