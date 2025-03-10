// import { TenantStatus } from "tenant-management-service";
import {AnyObject} from '@loopback/repository';
import {TenantStatus} from '../../enum';
import {Address, Contact, Lead, Resource} from '../../models';
import {IPlan, ISubscription} from '../../types';

export {IPlan} from './../../types';

export interface ITenant {
  deleted?: boolean;
  deletedOn?: Date;
  deletedBy?: string;
  createdOn?: Date;
  modifiedOn?: Date;
  createdBy?: string;
  modifiedBy?: string;
  id: string;
  name: string;
  status: TenantStatus;
  key: string;
  spocUserId?: string;
  domains: string[];
  contacts: Contact[];
  resources: Resource[];
  leadId?: string;
  addressId: string;
  lead?: Lead;
  address?: Address;
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
  | 'startDate'
  | 'endDate'
>;

export type CustomerDtoType = {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  phone: string;
  billingAddress: AddressDtoType;
  options?: AnyObject;
};

export interface PaymentSourceDtoType {
  id?: string;
  customerId: string;
  card?: ICard;
  options: AnyObject;
}

export interface ICard {
  gatewayAccountId: string;
  number: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

export type AddressDtoType = {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  options?: AnyObject;
};

export type InvoiceDtoType = {
  id?: string;
  customerId: string;
  options?: AnyObject;
  shippingAddress: AddressDtoType;
  charges: ChargeDtoType[];
  status?: string;
  currencyCode: string;
};
export type ChargeDtoType = {
  amount: number;
  description: string;
};

export enum PaymentMethodEnum {
  Cash = 'cash',
  Check = 'check',
  BankTranser = 'bank_transfer',
  Other = 'other',
  Custom = 'custom',
  PaymentSource = 'payment_source',
}
export interface TransactionType {
  amount?: number; // Optional, in cents, min=0
  paymentMethod: PaymentMethodEnum; // Required
  paymentSourceId?: string;
  referenceNumber?: string; // Optional, max 100 chars
  customPaymentMethodId?: string; // Optional, max 50 chars
  idAtGateway?: string; // Optional, max 100 chars
  status?: 'success' | 'failure'; // Optional
  date?: number; // Optional, timestamp in seconds (UTC)
  errorCode?: string; // Optional, max 100 chars
  errorText?: string; // Optional, max 65k chars
  comment?: string;
}
export type BillingCustomerType = {
  id?: string;
  tenantId: string; // tenantId of customer
  customerId: string; // id of customer generated on third-party billing module
  paymentSourceId?: string; // Optional field
  invoices?: InvoiceType[]; // Array of related invoices
};
export type InvoiceType = {
  id?: string;
  invoiceId: string; // Required field
  invoiceStatus?: boolean; // Optional boolean field for payment or invoice status
  billingCustomerId: string; // Required field for linking to BillingCustomer
};

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

export type SubscriptionBulkUpdationType = Partial<
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

export interface IMetaData {
  pipelineName: string;
}
