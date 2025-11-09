export class GetPaperDetailQuery {
  constructor(public readonly paperId: string,
    public readonly userId?: string) {
  }
}

