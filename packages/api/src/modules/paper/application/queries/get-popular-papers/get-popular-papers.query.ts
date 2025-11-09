export class GetPopularPapersQuery {
  constructor(
    public readonly limit: number = 20,
    public readonly days: number = 90,
  ) {}
}

