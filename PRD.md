# Collectify PRD

Status: Draft
Date: 2026-07-23

## Purpose

Collectify is an application for Turkish business owners who need a simple way to track customer debts, split debts into scheduled installments, see which payments are due, and record payments against specific debts or installments.

The first version should focus on clear debt tracking for one business owner account. It should not expand into broader accounting, invoicing, payment processing, messaging, staff management, inventory, or other business-management workflows.

## Product Boundaries

### In Scope

- One business owner account.
- Owner setup with:
  - Preferred interface language.
  - Default account currency.
- English and Turkish interface language support.
- Customer management.
- Debt creation for customers.
- Debt descriptions.
- Debt currency selection per customer debt.
- Splitting a debt into multiple installments.
- Due dates for installments.
- Viewing due payments.
- Recording a payment against a specific debt or installment selected by the owner.

### Out of Scope

Everything not listed in the in-scope section is out of scope for the first version.

This includes, but is not limited to:

- Multiple staff users or team accounts.
- Online payment collection.
- Automated SMS, WhatsApp, or email reminders.
- Invoices or tax documents.
- Accounting integrations.
- Inventory management.
- Customer self-service portals.
- Reporting beyond the due-payment views required for debt tracking.

## Problem Statement

Many small business owners track customer debts informally, which can make it difficult to know who owes money, what the debt is for, when each part of the debt should be paid, and which payments have already been received.

Collectify should give the owner a focused debt ledger for each customer, with enough structure to split debts into due installments and record actual payments without adding unrelated business-management complexity.

## Target Users

The primary user is a Turkish business owner who directly manages customer debts and payment follow-up.

The first version is for a single owner account, not a multi-user business workspace.

## Core Concepts

### Owner Account

The owner account represents the business owner using Collectify.

During setup, the owner selects:

- Interface language: English or Turkish.
- Default account currency.

The default account currency should be used as the default when creating new debts, but the owner may choose a different currency for a specific customer debt.

### Customer

A customer is a person or entity that owes money to the owner.

Required customer fields:

- Customer name.
- Customer code.
- Phone number.
- Address.

### Debt

A debt is an amount owed by a specific customer.

Each debt must have:

- Customer.
- Total amount.
- Currency.
- Description.

The debt currency applies to the whole debt. If the debt currency is different from the owner's default account currency, payments for that debt still use the debt currency.

### Installment

An installment is one scheduled part of a debt.

A debt can be split into multiple installments, each with:

- Amount due.
- Due date.
- Payment status based on recorded payments.

### Payment

A payment is money received from a customer.

The owner records each payment against a specific selected debt or installment. Payments for a debt use that debt's currency.

## User Stories

1. As a business owner, I want to create my owner account, so that I can manage my customer debts in Collectify.
2. As a business owner, I want to choose English or Turkish during setup, so that I can use the app in my preferred language.
3. As a business owner, I want to choose my default account currency during setup, so that new debts can start with the currency I normally use.
4. As a business owner, I want to add a customer with name, code, phone number, and address, so that I can identify who owes money.
5. As a business owner, I want to edit customer details, so that customer information stays accurate.
6. As a business owner, I want to view my customer list, so that I can find customers quickly.
7. As a business owner, I want to open a customer record, so that I can see that customer's debts and payments.
8. As a business owner, I want to add a debt for a customer, so that I can track money the customer owes.
9. As a business owner, I want to add a description to a debt, so that I know what the debt is for.
10. As a business owner, I want new debts to use my default account currency unless I choose another currency, so that debt entry is fast but flexible.
11. As a business owner, I want to choose a different currency for a specific customer debt, so that I can track debts that are not in my default currency.
12. As a business owner, I want a debt's currency to apply to all payments for that debt, so that amounts remain consistent.
13. As a business owner, I want to split a debt into installments, so that I can define when different parts of the debt should be paid.
14. As a business owner, I want each installment to have an amount and due date, so that the payment schedule is clear.
15. As a business owner, I want to view upcoming due installments, so that I know which customers should pay soon.
16. As a business owner, I want to view overdue installments, so that I know which payments need follow-up.
17. As a business owner, I want to record a payment against a specific installment or debt I choose, so that the app reflects the actual payment received.
18. As a business owner, I want the paid amount to update the selected debt or installment, so that I can see what remains unpaid.
19. As a business owner, I want paid installments to be distinguishable from unpaid installments, so that I can understand payment progress.
20. As a business owner, I want partially paid debts or installments to show their remaining balance, so that I know what is still owed.

## Functional Requirements

### Account Setup

- The app must support one owner account.
- The owner must select a preferred interface language during setup.
- Supported interface languages must be English and Turkish.
- The owner must select a default account currency during setup.

### Customer Management

- The owner must be able to create customers.
- The owner must provide customer name, customer code, phone number, and address when creating a customer.
- The owner must be able to view customers.
- The owner must be able to view a customer's debt history.
- The owner must be able to update customer details.

### Debt Management

- The owner must be able to create a debt for a customer.
- The owner must provide a description for each debt.
- Each debt must have one currency.
- The default debt currency should be the owner's account currency.
- The owner must be able to override the currency for a specific debt.
- A debt's currency must apply to all installments and payments for that debt.

### Installment Splitting

- The owner must be able to split a debt into multiple installments.
- Each installment must have an amount and due date.
- The app must track whether each installment is unpaid, partially paid, or paid based on recorded payments.
- The app must expose enough information for the owner to understand the remaining amount for each installment.

### Due Payments

- The owner must be able to see payments due by installment due date.
- The owner must be able to distinguish upcoming, due, overdue, partially paid, and paid items.
- The due-payment view must identify the customer, debt, installment amount, currency, due date, and remaining unpaid amount.

### Payment Recording

- The owner must be able to record a payment.
- The owner must select the specific debt or installment the payment applies to.
- Payment currency must match the selected debt's currency.
- Recording a payment must update the remaining amount for the selected debt or installment.

## Implementation Decisions

- Use the existing monorepo structure with a React frontend, NestJS backend, and shared contracts package.
- Model customer, debt, installment, and payment as separate domain concepts.
- Keep currency on the debt, not on each payment independently.
- Keep owner default currency as a defaulting mechanism only; it must not prevent a debt from using another currency.
- Keep v1 single-owner. Do not design role-based permissions or staff invitation flows for this PRD.
- Build the product around the owner choosing the exact debt or installment when recording payment.

## Testing Decisions

- Tests should verify external behavior rather than internal implementation details.
- Backend tests should cover customer creation, debt creation, installment splitting, due-payment retrieval, and payment recording.
- Contract tests should cover request and response shapes shared between frontend and backend.
- Frontend tests should cover the main owner flows: creating a customer, creating a debt, splitting it into installments, viewing due payments, and recording a payment.
- Currency behavior should be tested where it affects user-visible debt and payment amounts.
- Language selection should be tested enough to confirm English and Turkish can be selected and used by the interface.

## Open Product Questions

No open product questions are required for the v1 boundary captured in this PRD.

Future implementation may still need technical decisions that are intentionally not defined here, such as authentication method, exact currency list, data storage details, validation wording, and UI layout.

## Success Criteria

- The owner can complete setup with language and default currency.
- The owner can create and update customers with the required fields.
- The owner can create customer debts with descriptions and currencies.
- The owner can split a debt into scheduled installments.
- The owner can see due and overdue payments.
- The owner can record a payment against the specific debt or installment they choose.
- The app keeps balances consistent in the debt currency.
- No v1 workflow depends on out-of-scope features.
