import {getJsonSchema} from '@loopback/openapi-v3';
import {DataObject, Model, model, property} from '@loopback/repository';
import {Contact} from '../contact.model';
import {PaymentMethodEnum} from '../../services/proxies';

@model({
  description:
    'model describing payload used to create and onboard a tenant based on a plan',
})
export class CreateTenantWithPlanDTO extends Model {
  @property({
    type: 'string',
    description: 'id of the plan to be used for onboarding',
    required: true,
  })
  planId: string;

  @property({
    type: 'object',
    description:
      'metadata for the contact to be created, it is required when tenant is created without a lead',
    jsonSchema: getJsonSchema(Contact, {
      exclude: ['tenantId', 'id'],
    }),
  })
  contact: Omit<DataObject<Contact>, 'id' | 'tenantId'>;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
    description: 'address of the tenant owners',
  })
  address?: string;

  @property({
    type: 'string',
    description: 'city of the tenant owner',
  })
  city?: string;

  @property({
    description: 'state of the tenant owner',
    type: 'string',
  })
  state?: string;

  @property({
    description: 'zip code of the tenant owner',
    type: 'string',
  })
  zip?: string;

  @property({
    type: 'string',
    description: 'country of the tenant owner',
  })
  country?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      pattern: '^[a-z0-9]+$',
      maxLength: 10,
    },
  })
  key: string;

  @property({
    type: 'string',
    description:
      'Acquisition source of the tenant. Eg. AWS Marketplace, Super Admin Portal, Registration Page.',
  })
  source: string;

  @property({
    required: true,
    jsonSchema: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'string',
        format: 'hostname',
      },
    },
  })
  domains: string[];

  // Adding the paymentMethod property with PaymentMethodEnum type
  @property({
    type: 'string',
    description: 'payment method',
    required: true,
    jsonSchema: {
      enum: Object.values(PaymentMethodEnum),
    },
  })
  paymentMethod: PaymentMethodEnum;

  @property({
    type: 'string',
    required: false,
    jsonSchema: {
      maxLength: 300,
    },
  })
  comment?: string; // Optional, max 300 chars
  constructor(data?: Partial<CreateTenantWithPlanDTO>) {
    super(data);
  }
}
