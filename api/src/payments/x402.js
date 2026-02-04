/**
 * x402 payment middleware setup
 * Protects paid endpoints and integrates ERC-8004 facilitator extensions
 */

const { paymentMiddleware } = require('@x402/express');
const { HTTPFacilitatorClient, x402ResourceServer } = require('@x402/core/server');
const { registerExactEvmScheme } = require('@x402/evm/exact/server');
const config = require('../config');
const PaymentService = require('../services/PaymentService');
const { createErc8004Extension } = require('./erc8004Extension');

const facilitatorClient = new HTTPFacilitatorClient({
  url: config.x402.facilitatorUrl
});

const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(resourceServer, { networks: [config.x402.network] });
resourceServer.registerExtension(createErc8004Extension(config));

resourceServer.onAfterSettle(async (context) => {
  try {
    await PaymentService.recordSettlement({
      purpose: 'agent_registration',
      paymentPayload: context.paymentPayload,
      requirements: context.requirements,
      result: context.result
    });
  } catch (error) {
    console.error('Failed to record payment settlement:', error);
  }
});

resourceServer.onSettleFailure(async (context) => {
  try {
    await PaymentService.handleSettlementFailure({
      requirements: context.requirements
    });
  } catch (error) {
    console.error('Failed to handle settlement failure:', error);
  }
});

const registrationRouteConfig = {
  accepts: {
    payTo: (context) => {
      const body = context?.adapter?.getBody?.() || {};
      return typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';
    },
    scheme: 'exact',
    price: config.x402.registrationPrice,
    network: config.x402.network,
    maxTimeoutSeconds: config.x402.maxTimeoutSeconds
  },
  extensions: {
    'erc-8004': {}
  },
  unpaidResponseBody: async () => ({
    contentType: 'application/json',
    body: {
      error: 'Payment required',
      hint: 'Use x402 to pay and retry with the PAYMENT-SIGNATURE header.'
    }
  })
};

const registrationRoutes = {
  'POST /register': registrationRouteConfig,
  'POST /api/v1/agents/register': registrationRouteConfig
};

const registrationPaymentMiddleware = paymentMiddleware(registrationRoutes, resourceServer);

module.exports = {
  registrationPaymentMiddleware
};
