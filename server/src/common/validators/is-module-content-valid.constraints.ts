import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ModuleDto } from '../../course/dto';

function convertEmptyToNull(value: any): any {
  return value === undefined || value === null || value === '' ? null : value;
}

@ValidatorConstraint({ name: 'isContentValid' })
export class IsModuleContentValid implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const module = args.object as ModuleDto;
    switch (module.contentType) {
      case 'VIDEO':
        const duration = convertEmptyToNull(module.duration);
        return !!module.url && (duration === null || duration > 0);
      case 'PDF':
        const pageCount = convertEmptyToNull(module.pageCount);
        return !!module.filePath && (pageCount === null || pageCount > 0);
      case 'WEBLINK':
        return !!module.url;
      default:
        return false;
    }
  }
  defaultMessage() {
    return 'Module content fields do not match the specified content type';
  }
}
