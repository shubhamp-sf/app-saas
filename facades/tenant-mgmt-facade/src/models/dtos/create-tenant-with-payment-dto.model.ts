import {model, property} from '@loopback/repository';
import {CreateTenantWithPlanDTO} from './create-tenant-dto.model';
import {PaymentDetailsDTO} from './payment-details-dto.model';

@model()
export class CreateTenantWithPaymentDTO extends CreateTenantWithPlanDTO {
  @property({
    type: 'string',
    required: true,
  })
  paymentToken: string;
}
