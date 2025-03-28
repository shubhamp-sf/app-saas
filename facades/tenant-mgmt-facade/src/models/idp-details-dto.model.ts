import {getJsonSchema} from '@loopback/openapi-v3';
import {AnyObject, Model, model, property} from '@loopback/repository';
import { UserDto } from './user-dto.model';
import { Tenant } from '../types';

@model({
  description: 'model describing payload for IDP controller',
})
export class IdpDetailsDTO extends UserDto {
  @property({
    type: 'object',
    description: 'Tenat object',
    jsonSchema: getJsonSchema(Object),
  })
  tenant: Tenant;
 
  constructor(data?: Partial<IdpDetailsDTO>) {
    super(data);
  }
}
