import {BindingScope, inject, injectable, service} from '@loopback/core';
import {Filter} from '@loopback/repository';
import {HttpErrors, Request, RestBindings} from '@loopback/rest';
import {CryptoHelperService} from '@sourceloop/ctrl-plane-tenant-management-service';
import {
  BillingCustomerType,
  CustomerDtoType,
  InvoiceDtoType,
  PaymentSourceDtoType,
  SubscriptionProxyService,
  TransactionType,
} from './proxies';
@injectable({scope: BindingScope.TRANSIENT})
export class BillingHelperService {
  constructor(
    @inject('services.SubscriptionProxyService')
    private readonly subscriptionProxyService: SubscriptionProxyService,
    @service(CryptoHelperService)
    private readonly cryptoHelperService: CryptoHelperService,
    @inject(RestBindings.Http.REQUEST)
    private readonly request: Request,
  ) {}

  async createCustomer(
    tenantId: string,
    customerDto: Omit<CustomerDtoType, 'id'>,
    token?: string,
  ): Promise<CustomerDtoType> {
    token = token ?? this.request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new HttpErrors.Unauthorized(
        'Authorization header not present. [Create Customer]',
      );
    }
    return this.subscriptionProxyService.createCustomer(
      token.replace(/^Bearer\s+/i, ''),
      customerDto,
      tenantId,
    );
  }

  async createInvoice(
    invoiceDto: Omit<InvoiceDtoType, 'id'>,
    token?: string,
  ): Promise<InvoiceDtoType> {
    token = token ?? this.request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new HttpErrors.Unauthorized(
        'Authorization header not present [Create Invoice]',
      );
    }
    return this.subscriptionProxyService.createInvoice(
      token.replace(/^Bearer\s+/i, ''),
      invoiceDto,
    );
  }
  async getCustomer(filter: Filter<BillingCustomerType>): Promise<{
    customerDetails: CustomerDtoType;
    info: BillingCustomerType;
  }> {
    const token = this.request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new HttpErrors.Unauthorized(
        'Authorization header not present [Get Customer]',
      );
    }

    return this.subscriptionProxyService.getCustomer(
      token.replace(/^Bearer\s+/i, ''),
      filter,
    );
  }

  async createPaymentSource(
    paymentDetails: PaymentSourceDtoType,
  ): Promise<PaymentSourceDtoType> {
    const token = this.request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new HttpErrors.Unauthorized(
        'Authorization header not present [Create Payment Source]',
      );
    }
    return this.subscriptionProxyService.createPaymentSource(
      token.replace(/^Bearer\s+/i, ''),
      paymentDetails,
    );
  }

  async applyPaymentForInvoice(
    invoiceId: string,
    transactionDto: TransactionType,
    token?: string,
  ): Promise<void> {
    token = token ?? this.request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new HttpErrors.Unauthorized('Authorization header not present');
    }
    return this.subscriptionProxyService.applyPaymentForInvoice(
      token.replace(/^Bearer\s+/i, ''),
      invoiceId,
      transactionDto,
    );
  }
}
