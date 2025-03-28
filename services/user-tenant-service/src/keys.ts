import { BindingKey } from "@loopback/context";
import { BINDING_PREFIX } from "@sourceloop/core";
import { ConfigureIdpFunc, IdpResp } from "./providers/types";

export namespace UserTenantServiceBindings {
    /**
     * Binding key for the Idp keycloak provider.
     */
    export const IDP_KEYCLOAK = BindingKey.create<ConfigureIdpFunc<IdpResp>>(
      'sf.user.idp.keycloak',
    );
  }