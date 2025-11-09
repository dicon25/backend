export class GetMyRecommendedPapersQuery {
  constructor(public readonly userId: string,
    public readonly limit: number) {
  }
}

