export enum ReactionType {
  LIKE = 'LIKE',
  UNLIKE = 'UNLIKE',
}

export class ReactionEntity {
  id:        string;
  userId:    string;
  paperId:   string;
  type:      ReactionType;
  createdAt: Date;

  constructor(data: ReactionEntity) {
    Object.assign(this, data);
  }
}

