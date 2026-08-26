# Collectify PRD

Status: Draft
Date: 2026-08-26

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
- One-payment debts with a required due date.
- Splitting a debt into multiple installments.
- Automatic weekly or monthly installment generation.
- Manual installment amount and due-date customization.
- Viewing due payments.
- Recording a payment against a specific debt or installment selected by the owner.
- Correcting and deleting an accidentally recorded payment.

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
- A payment plan: one payment or installments.

The debt currency applies to the whole debt. If the debt currency is different from the owner's default account currency, payments for that debt still use the debt currency.

A one-payment debt has one required due date. An installment debt has two or more scheduled installments whose amounts add up to the debt total.

### Installment

An installment is one scheduled part of a debt.

A debt can be split into multiple installments, each with:

- Amount due.
- Due date.
- Payment status based on recorded payments.

Installments can be generated automatically from a number of payments, first due date, and weekly or monthly frequency. The owner can then customize installment amounts and due dates manually.

### Payment

A payment is money received from a customer.

The owner records each payment against one specific selected debt or installment. The payment cannot exceed the selected debt or installment's remaining balance. Payments for a debt use that debt's currency.

Each payment has an amount, payment date, selected debt, and selected installment when the debt uses installments.

A recorded payment can be corrected or deleted. Correcting or deleting a payment must recalculate every affected installment, debt, and customer balance.

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
21. As a business owner, I want to choose between one payment and installments when creating a debt, so that the payment plan matches my agreement with the customer.
22. As a business owner, I want every one-payment debt to have a due date, so that it can appear in due-payment tracking.
23. As a business owner, I want to generate equal weekly or monthly installments from a number of payments and first due date, so that common payment plans are quick to create.
24. As a business owner, I want to customize installment amounts and dates, so that I can represent payment plans that are not equal or regularly spaced.
25. As a business owner, I want installment totals to match the debt total, so that balances remain consistent.
26. As a business owner, I want installment amounts to be recalculated when I change the debt total, so that the plan does not become inconsistent.
27. As a business owner, I want to select the exact open debt and installment when recording a payment, so that the payment is applied where the customer and I expect.
28. As a business owner, I want a payment amount to be limited to the selected item's remaining balance, so that it is not distributed unexpectedly.
29. As a business owner, I want to edit an accidentally recorded payment, so that I can correct its debt, installment, amount, or date.
30. As a business owner, I want to delete an accidentally recorded payment, so that its effect is removed from the customer's balances.
31. As a business owner, I want to edit the unpaid part of an existing debt plan after payments have been recorded, so that future payment expectations can be corrected without invalidating received payments.

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
- The customer list must help the owner find customers and understand their remaining debt, overdue amount, and next due date.
- The owner must be able to open a dedicated customer details page.
- The customer details page must show the customer's information, debt records, financial summary, and payment history.
- The owner must be able to update customer details.
- Debt creation and payment recording initiated from a customer details page must keep that customer selected.

### Debt Management

- The owner must be able to create a debt for a customer.
- The owner must provide a description for each debt.
- Each debt must have one currency.
- The default debt currency should be the owner's account currency.
- The owner must be able to override the currency for a specific debt.
- A debt's currency must apply to all installments and payments for that debt.
- The owner must choose whether a debt uses one payment or installments.
- A one-payment debt must have one required due date.
- A one-payment debt must appear as a simple debt record rather than an installment list.
- Debt records must show enough information to understand the total, paid amount, remaining amount, status, and next due date.

### Installment Splitting

- The owner must be able to split a debt into two or more installments.
- Each installment must have an amount and due date.
- Automatic installment generation must require the number of payments, first due date, and a weekly or monthly frequency.
- Weekly generation must place due dates seven days apart.
- Monthly generation must use the same calendar day where possible and the final valid day when that day does not exist in a month.
- Automatic generation must divide the debt total equally and place any rounding difference in the final installment.
- The generated installment preview must update without requiring a separate generation action.
- The owner must be able to enter manual installment editing from the generated preview without opening another page or nested flow.
- Manual editing must allow changing each installment's amount and due date and adding or deleting installment rows.
- Every installment amount must be positive, every installment must have a valid due date, and installment amounts must sum exactly to the debt total before the debt can be saved.
- Changing a valid committed debt total outside manual editing must preserve the installment dates and recalculate equal installment amounts across the existing rows.
- Changing a valid committed debt total during manual editing must exit manual editing, preserve the installment dates, recalculate equal installment amounts across the existing rows, and notify the owner that the amounts were recalculated.
- Debt-total recalculation must occur after the value is committed, such as on blur or Enter, rather than after each keystroke.
- The app must track whether each installment is unpaid, partially paid, or paid based on recorded payments.
- The app must expose enough information for the owner to understand the remaining amount for each installment.

### Existing Debt Plan Editing

- The owner must be able to edit an existing debt plan after payments have been recorded.
- Editing a debt plan must not silently rewrite, move, or delete recorded payments.
- The debt total must not be reduced below the total amount already recorded as received for that debt.
- An installment amount must not be reduced below the amount already recorded against that installment.
- An installment with recorded payments must not be deleted unless those payment records are first corrected or deleted.
- Unpaid installment amounts and due dates may be changed as long as the resulting plan remains valid.

### Due Payments

- The owner must be able to see payments due by installment due date.
- The owner must be able to distinguish upcoming, due, overdue, partially paid, and paid items.
- The due-payment view must identify the customer, debt, installment amount, currency, due date, and remaining unpaid amount.
- The due-payment view is a cross-customer action queue, while debt and payment history remain available from customer details.

### Payment Recording

- The owner must be able to start payment recording from a customer details page.
- The selected customer must remain fixed while recording or editing the payment.
- The owner must select a specific open debt.
- If the selected debt has installments, the owner must select a specific unpaid or partially paid installment.
- Paid installments must not appear in the installment selector.
- If the selected debt uses one payment, the app must not show an installment selector.
- The owner may record a partial payment.
- The payment amount must be positive and must not exceed the selected debt or installment's remaining balance.
- The owner must provide a payment date.
- A payment must not be distributed automatically across multiple installments.
- Payment currency must match the selected debt's currency.
- Recording a payment must update the remaining amount for the selected debt or installment.
- A recorded payment must appear in the customer's payment history with its debt, installment when applicable, amount, and payment date.
- The owner must be able to open payment editing directly from a payment-history row.
- Payment editing must reuse the payment form with the existing debt, installment, amount, and payment date preselected.
- The owner must be able to change the debt, installment, amount, and payment date within the same customer, subject to the same payment validation rules.
- When editing a payment, its currently selected installment must remain selectable even if that payment caused the installment to become paid; other paid installments must remain unavailable.
- Payment-edit validation must calculate the available balance as though the original payment's effect had first been removed.
- Saving a payment edit must restore the old payment's effect and apply the corrected payment atomically.
- The owner must be able to delete a payment record from payment editing after confirming the action.
- Deleting a payment must remove its effect and recalculate all affected installment, debt, and customer balances.

## Implementation Decisions

- Use the existing monorepo structure with a React frontend, NestJS backend, and shared contracts package.
- Model customer, debt, installment, and payment as separate domain concepts.
- Keep currency on the debt, not on each payment independently.
- Keep owner default currency as a defaulting mechanism only; it must not prevent a debt from using another currency.
- Keep v1 single-owner. Do not design role-based permissions or staff invitation flows for this PRD.
- Build the product around the owner choosing the exact debt or installment when recording payment.
- Keep each payment applied to one debt or installment in v1; do not introduce automatic or manual allocation across multiple installments.
- Centralize installment generation, validation, and debt-total recalculation rules behind one domain operation so every entry point uses the same behavior.
- Apply payment creation, editing, and deletion atomically so balances cannot expose a partially updated state.
- Keep debt management customer-first. Use customer details as the main debt ledger and the due-payment view as the cross-customer work queue.

## Testing Decisions

- Tests should verify external behavior rather than internal implementation details.
- Backend tests should cover customer creation, debt creation, installment splitting, due-payment retrieval, and payment recording.
- Backend tests should cover weekly and monthly generation, month-end dates, final-installment rounding, manual-plan validation, debt-total recalculation, existing-plan edits, and payment correction and deletion.
- Contract tests should cover request and response shapes shared between frontend and backend.
- Frontend tests should cover the main owner flows: creating a customer, opening customer details, creating both payment-plan types, customizing installments, viewing due payments, recording a payment, and editing or deleting a payment.
- Tests must prove that a payment cannot exceed the selected item's remaining balance and is never silently allocated to another installment.
- Tests must prove that changing a debt total during manual editing preserves dates, recalculates amounts after the value is committed, exits manual editing, and produces a user-visible notification.
- Tests must prove that payment editing or deletion restores the previous balance effects before applying the new state.
- Currency behavior should be tested where it affects user-visible debt and payment amounts.
- Language selection should be tested enough to confirm English and Turkish can be selected and used by the interface.

## Open Product Questions

- Should deleting a payment remove it from visible history completely, or retain a cancelled audit entry?
- Which fields of a fully paid installment, if any, may be changed when editing an existing debt plan?
- When moving an edited payment to another debt with a different currency, should the amount be cleared for re-entry or should cross-currency movement be disallowed?

Future implementation may still need technical decisions that are intentionally not defined here, such as authentication method, exact currency list, data storage details, validation wording, and UI layout.

## Success Criteria

- The owner can complete setup with language and default currency.
- The owner can create and update customers with the required fields.
- The owner can create customer debts with descriptions and currencies.
- The owner can create a one-payment debt with a due date.
- The owner can automatically generate weekly or monthly installments and customize their amounts and dates.
- Installment amounts always sum to the debt total when a debt is saved.
- The owner can see due and overdue payments.
- The owner can record a partial or full payment against the specific debt or installment they choose without exceeding its remaining balance.
- The owner can correct or delete an accidentally recorded payment and see all affected balances recalculate correctly.
- The owner can edit the valid unpaid portion of an existing debt plan without invalidating recorded payments.
- The app keeps balances consistent in the debt currency.
- No v1 workflow depends on out-of-scope features.
