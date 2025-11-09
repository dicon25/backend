import { DataClass } from 'dataclasses';

export class RegisterCommand extends DataClass {
  email:                string;
  password:             string;
  name:                 string;
  profilePicture?:      Express.Multer.File;
  interestedCategories?: string[];
}

