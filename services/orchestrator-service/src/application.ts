import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';
import {OrchestratorServiceBindings} from '@arc-saas/orchestrator-service';
import {AwsCodeBuildService, TierDetailsProvider} from './services';
import {TenantRegistrationProvider} from './services/tenant-registration.handler';
import {Bindings} from './types';
import {
  EventBridgeConnector,
  EventStreamConnectorComponent,
} from 'loopback4-message-bus-connector';

export {ApplicationConfig};

export class OrchestratorServiceApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.bind(OrchestratorServiceBindings.TIER_DETAILS_PROVIDER).toProvider(
      TierDetailsProvider,
    );
    this.bind(OrchestratorServiceBindings.BUILDER_SERVICE).toClass(
      AwsCodeBuildService,
    );

    this.bind(Bindings.TENANT_REGISTRATION_HANDLER).toProvider(
      TenantRegistrationProvider,
    );
    this.component(EventStreamConnectorComponent);
    this.component(EventBridgeConnector);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions

    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
}
