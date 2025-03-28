export type BaseUser = {
  id: string;
};

export type LeadUser = {
  userTenantId: string;
  email: string;
} & BaseUser;

export type LeadUserWithToken = {
  token: string;
} & LeadUser;

import { AnyObject } from '@loopback/repository';
import {IServiceConfig} from '@sourceloop/core';

export interface ISubscription {
  deleted?: boolean;
  deletedOn?: Date;
  deletedBy?: string;
  createdOn?: Date;
  modifiedOn?: Date;
  createdBy?: string;
  modifiedBy?: string;
  id: string;
  subscriberId: string;
  startDate: string;
  endDate: string;
  status: number;
  invoiceId: string;
  planId: string;
  plan?: IPlan;
}

// sonarignore:start
export interface ITenantManagementServiceConfig extends IServiceConfig {
  //do nothing
}

export type SubscriptionCreationType = Omit<
  ISubscription,
  | 'id'
  | 'deleted'
  | 'deletedOn'
  | 'deletedBy'
  | 'createdOn'
  | 'modifiedOn'
  | 'createdBy'
  | 'modifiedBy'
  | 'plan'
>;

export type SubscriptionUpdationType = Partial<
  Omit<
    ISubscription,
    | 'id'
    | 'deleted'
    | 'deletedOn'
    | 'deletedBy'
    | 'createdOn'
    | 'modifiedOn'
    | 'createdBy'
    | 'modifiedBy'
    | 'plan'
  >
>;

export interface IBillingCycle {
  deleted: boolean;
  deletedOn?: string;
  deletedBy?: string;
  createdOn: string;
  modifiedOn?: string;
  createdBy: string;
  modifiedBy?: string;
  id: string;
  cycleName: string;
  duration: number;
  durationUnit: string;
  description: string;
}

export interface ICurrency {
  id: string;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  country: string;
}

export interface IPlan {
  deleted?: boolean;
  deletedOn?: Date;
  deletedBy?: string;
  createdOn?: Date;
  modifiedOn?: Date;
  createdBy?: string;
  modifiedBy?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  currencyId: string;
  metaData: IMetaData;
  tier: string;
  size?: string;
  billingCycleId: string;
  billingCycle?: IBillingCycle;
  currency?: ICurrency;
  sizeConfig?: object;
  features?: object;
}

export interface IMetaData {
  pipelineName: string;
}

export interface IPlanItem {
  deleted?: boolean;
  deletedOn?: string;
  deletedBy?: string;
  createdOn?: string;
  modifiedOn?: string;
  createdBy?: string;
  modifiedBy?: string;
  id: string;
  name: string;
  planItemType: string;
  value: IValue;
  planId?: string;
}

export interface IValue {
  name: string;
  value: number | string | boolean;
}
export type ConfigureIdpFunc<T> = (payload: IdpDetails) => Promise<T>;
export interface Tenant {
  identityProvider: string; 
  id: string; 
  name: string; 
  key: string; 
}

export interface IdpDetails {
  tenant: Tenant;
}
export interface IdpResp {
  authId: string;
}
export enum IdPKey {
  AUTH0 = 'auth0',
  COGNITO = 'cognito',
  KEYCLOAK = 'keycloak',
}
