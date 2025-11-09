import { DataClass } from 'dataclasses';

export class UpdateProfileCommand extends DataClass {
  userId:         string;
  name?:          string;
  profilePicture?: Express.Multer.File;
}

