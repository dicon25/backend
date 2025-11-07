export class PaperEntity {
  id: string;
  paperId: string;
  title: string;
  categories: string[];
  authors: string[];
  summary: string;
  content: any;
  doi: string;
  url?: string;
  pdfUrl?: string;
  issuedAt?: Date;
  likeCount: number;
  unlikeCount: number;
  totalViewCount: number;
  thumbnailId?: string;
  pdfId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PaperEntity) {
    Object.assign(this, data);
  }
}



