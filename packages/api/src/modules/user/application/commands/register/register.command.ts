export class RegisterCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name: string,
    public readonly profilePicture?: Express.Multer.File,
    public readonly interestedCategories?: string[],
  ) {
  }
}

