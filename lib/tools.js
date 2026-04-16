/**
 * MCP Tool definitions for HubCycle.
 *
 * Each tool has a name, description, and JSON Schema for its input.
 * These are registered with the MCP server and sent to Claude.
 */

export const TOOLS = [
  {
    name: 'create_partner',
    description: 'Create a new partner (customer or supplier) in HubCycle ERP. Returns the new partner ID.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Partner name (company or person)' },
        email: { type: 'string', description: 'Email address', nullable: true },
        phone: { type: 'string', description: 'Phone number', nullable: true },
        is_company: { type: 'boolean', description: 'Whether this is a company (true) or individual (false)', default: true },
        customer_rank: { type: 'number', description: 'Customer rank (0 = not a customer)', default: 0 },
        supplier_rank: { type: 'number', description: 'Supplier rank (0 = not a supplier)', default: 0 },
        country_code: { type: 'string', description: 'ISO 2-letter country code (e.g. FR, US)', nullable: true },
        city: { type: 'string', description: 'City name', nullable: true },
        street: { type: 'string', description: 'Street address', nullable: true },
      },
      required: ['name'],
    },
  },
  {
    name: 'edit_partner',
    description: 'Edit an existing partner in HubCycle ERP. Specify the partner odoo_id and the fields to update.',
    inputSchema: {
      type: 'object',
      properties: {
        odoo_id: { type: 'number', description: 'The Odoo ID of the partner to edit' },
        fields: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            country_code: { type: 'string', description: 'ISO 2-letter country code' },
            city: { type: 'string' },
            street: { type: 'string' },
          },
        },
      },
      required: ['odoo_id', 'fields'],
    },
  },
  {
    name: 'create_sales_opportunity',
    description: 'Create a new sales opportunity (CRM lead) in HubCycle. You are automatically set as the owner.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Opportunity title' },
        partner_odoo_id: { type: 'number', description: 'Odoo ID of the customer (partner)' },
        expected_revenue: { type: 'number', description: 'Expected revenue in EUR', nullable: true },
        stage_name: { type: 'string', description: 'Pipeline stage name (e.g. "Qualification", "Proposition")', nullable: true },
        notes: { type: 'string', description: 'Internal notes', nullable: true },
        probability: { type: 'number', description: 'Win probability (0-100)', nullable: true },
      },
      required: ['name', 'partner_odoo_id'],
    },
  },
  {
    name: 'edit_sales_opportunity',
    description: 'Edit an existing sales opportunity. You must be the owner or have full access.',
    inputSchema: {
      type: 'object',
      properties: {
        odoo_id: { type: 'number', description: 'The Odoo ID of the opportunity' },
        fields: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            stage_name: { type: 'string', description: 'Pipeline stage name' },
            expected_revenue: { type: 'number', description: 'Expected revenue in EUR' },
            notes: { type: 'string', description: 'Internal notes' },
            probability: { type: 'number', description: 'Win probability (0-100)' },
          },
        },
      },
      required: ['odoo_id', 'fields'],
    },
  },
  {
    name: 'create_sourcing_opportunity',
    description: 'Create a new sourcing opportunity (SRM lead) in HubCycle. You are automatically set as the owner.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Opportunity title' },
        partner_odoo_id: { type: 'number', description: 'Odoo ID of the supplier (partner)' },
        expected_value: { type: 'number', description: 'Expected value in EUR', nullable: true },
        deposit_maturity: { type: 'string', description: 'Deposit maturity stage: S1, S2, S3, S4, or S5', nullable: true },
        notes: { type: 'string', description: 'Internal notes', nullable: true },
      },
      required: ['name', 'partner_odoo_id'],
    },
  },
  {
    name: 'edit_sourcing_opportunity',
    description: 'Edit an existing sourcing opportunity. You must be the owner or have full access.',
    inputSchema: {
      type: 'object',
      properties: {
        odoo_id: { type: 'number', description: 'The Odoo ID of the sourcing opportunity' },
        fields: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            deposit_maturity: { type: 'string', description: 'Deposit maturity stage: S1-S5' },
            expected_value: { type: 'number', description: 'Expected value in EUR' },
            notes: { type: 'string', description: 'Internal notes' },
          },
        },
      },
      required: ['odoo_id', 'fields'],
    },
  },
  {
    name: 'create_sale_order',
    description: 'Create a new sale order with line items in HubCycle. You are automatically set as the salesperson.',
    inputSchema: {
      type: 'object',
      properties: {
        partner_odoo_id: { type: 'number', description: 'Odoo ID of the customer' },
        lines: {
          type: 'array',
          description: 'Order line items',
          items: {
            type: 'object',
            properties: {
              product_odoo_id: { type: 'number', description: 'Odoo ID of the product' },
              quantity: { type: 'number', description: 'Quantity in product UoM' },
              unit_price: { type: 'number', description: 'Unit price in EUR' },
            },
            required: ['product_odoo_id', 'quantity', 'unit_price'],
          },
          minItems: 1,
        },
        notes: { type: 'string', description: 'Order notes', nullable: true },
      },
      required: ['partner_odoo_id', 'lines'],
    },
  },
  {
    name: 'edit_product',
    description: 'Edit a product template in HubCycle. You must be the PM, Quality Manager, or Purchase Manager for this product.',
    inputSchema: {
      type: 'object',
      properties: {
        odoo_id: { type: 'number', description: 'The Odoo ID of the product template' },
        fields: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            name: { type: 'string' },
            list_price: { type: 'number', description: 'Sales price in EUR' },
            standard_price: { type: 'number', description: 'Cost price in EUR' },
            pm_in_charge_odoo_id: { type: 'number', description: 'Odoo ID of the Product Manager' },
            quality_manager_odoo_id: { type: 'number', description: 'Odoo ID of the Quality Manager' },
            purchase_manager_odoo_id: { type: 'number', description: 'Odoo ID of the Purchase Manager' },
            notes: { type: 'string', description: 'Internal notes' },
          },
        },
      },
      required: ['odoo_id', 'fields'],
    },
  },
  {
    name: 'update_stock_forecast',
    description: 'Update stock forecast entries for a product. Provide monthly quantity estimates. No Odoo writeback (dashboard-native data).',
    inputSchema: {
      type: 'object',
      properties: {
        product_odoo_id: { type: 'number', description: 'Odoo ID of the product' },
        forecasts: {
          type: 'array',
          description: 'Monthly forecast entries',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', description: 'Month in YYYY-MM format (e.g. 2026-05)' },
              quantity_tons: { type: 'number', description: 'Forecasted quantity in tonnes' },
            },
            required: ['month', 'quantity_tons'],
          },
          minItems: 1,
        },
      },
      required: ['product_odoo_id', 'forecasts'],
    },
  },
];
