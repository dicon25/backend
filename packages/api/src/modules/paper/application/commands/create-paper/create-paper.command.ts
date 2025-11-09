export class CreatePaperCommand {
  constructor(
    public readonly paperId: string,
    public readonly title: string,
    public readonly categories: string[],
    public readonly authors: string[],
    public readonly summary: string,
    public readonly translatedSummary?: string,
    public readonly content: any,
    public readonly doi: string,
    public readonly pdfId: string,
    public readonly url?: string,
    public readonly pdfUrl?: string,
    public readonly issuedAt?: Date,
    public readonly thumbnailId?: string,
    public readonly hashtags?: string[],
    public readonly interestedUserIds?: string[],
  ) {
  }
}

