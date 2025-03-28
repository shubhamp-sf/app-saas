import { AnyObject } from "@loopback/repository";
import { UserDto } from "../models/user-dto.model";

export type ConfigureIdpFunc<T> = (payload: IdpDetails) => Promise<T>;
export interface Tenant {
  identityProvider: string; 
  id: string;
  name: string; 
  key: string;
}


export interface IdpDetails {
  tenant: Tenant;
  firstName: string;
  lastName: string;
  roleId: string;
  username: string;
  email: string;
  designation?: string;
  middleName?: string;
  locale?: string;
}
export interface IdpResp {
  authId: string;
  authSecret:string;
}
export enum IdPKey {
  AUTH0 = 'auth0',
  COGNITO = 'cognito',
  KEYCLOAK = 'keycloak',
}