# Dext partner features vs Exdox

Checked 7 October 2026 against [Dext's UK partner pricing feature list](https://dext.com/uk/partner/pricing) and its linked product pages. This is an internal product roadmap, not a public claim of feature parity. Dext's page mixes Solo, Essentials, Advanced and paid add-ons; a row here means Dext advertises the capability somewhere in that range, not that every plan includes it. Its plan tick icons and dynamic prices are not reliably exposed in the page text, so check the current plan matrix before using this for a sales comparison.

**How to mark progress:** `[x]` means Exdox's current source has a broadly usable equivalent in the main product. `[ ]` means missing, narrower, or limited to the private owner-only Accounting pilot. A tick does not claim equal depth, accuracy, scale, availability on every paid plan, or verified live behaviour. Change a box only after checking the website, API, app, access gate and a representative end-to-end workflow.

The categories identify which **client code** would need changing to deliver or improve each feature. **Website** means no Android app change; it can still require API, email, payment, browser-extension or provider work. **App** means no website change and can still require API work. **Both** means website and Android app changes are expected, usually with API work too. A feature already ticked is filed by its current delivery surface. These are planning estimates; confirm the exact scope before implementation.

## Website

- [x] Web upload of receipts and invoices. Exdox has Costs and Sales upload and review. [Website](../src/App.tsx); [API](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/handlers/processExpense.ts).
- [ ] Email-forwarded purchase receipts and supplier bills to a dedicated inbox. Exdox has a Sales inbound token path, but that is narrower than Dext's general expense and supplier-invoice email capture. [Sales inbound](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/handlers/salesInbound.ts).
- [ ] WhatsApp document submission. No equivalent was found in Exdox source.
- [ ] Automatic invoice fetch from authorised suppliers. No equivalent was found.
- [x] Automatic line-item grouping for posting. Supplier and customer rules can group extracted lines by description (keeping tax rates separate) or tax rate, apply named description groups and categories, and send reviewed grouped allocations to Xero. Check OCR amounts and grouped lines in Review before publishing.
- [x] Automatically split a multi-document PDF into separate Cost or Sales records. Exdox web uploads offer one document per page or automatic boundary detection and store a separate PDF containing only each document's pages. The result enters review. Local PDF split tests passed; live extraction accuracy is unverified. [Dext upload guide](https://help.dext.com/en/articles/106273-how-to-upload-costs-and-sales-documents-in-dext); [Exdox upload handler](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/handlers/processExpense.ts).
- [ ] PDF bank-statement extraction into transactions. The private Accounting pilot imports bank CSV, not PDF statement extraction for all customers. [Accounting UI](../src/AccountingReconciliation.tsx).
- [ ] Rental-statement extraction. No equivalent was found.
- [ ] Live bank feeds for customers. The private TrueLayer foundation is disabled until commercial, consent and UK regulatory conditions are satisfied; it is not a current customer feature. [Project context](../PROJECT.md).
- [x] Supplier rules for recurring category, tax and payment-method defaults. Exdox applies saved rules before review. [API](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/db.ts); [website](../src/App.tsx).
- [x] Dext Smart Split: supplier or customer rules that divide a transaction into fixed-amount or percentage line items with their own categories. Exdox rule edits now define percentage or fixed-net allocations, each stored on the reviewed Cost/Sales record and sent as separate Xero lines. The reviewer can edit the split; a fixed rule too large for a document leaves a review warning. Local split tests/builds passed; live Xero posting is unverified. [Dext Smart Split guide](https://help.dext.com/en/articles/416726-how-to-use-smart-split-in-dext); [Exdox rule application](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/db.ts).
- [ ] Broad smart suggestions and automatic categorisation. Exdox now suggests a Cost category after at least two approved documents from the same supplier agree, while explicit supplier rules and app-selected categories take priority. This is a useful learning-based category suggestion, but Dext's wider suggestions across other bookkeeping fields remain a gap. No extra AI API call is used.
- [ ] Supplier-statement extraction and reconciliation against bills. No equivalent was found.
- [ ] Customer-wide bank match between captured paperwork and live bank transactions. The private Accounting pilot can suggest exact ledger matches for imported CSV/feed rows; it is isolated from ordinary Costs and Sales and live feeds remain gated. [Accounting UI](../src/AccountingReconciliation.tsx).
- [ ] Customer-wide bank rules. The private Accounting pilot has reviewed posting rules for its own ledger; they are not a general Exdox automation. [Accounting UI](../src/AccountingReconciliation.tsx).
- [x] Optional automatic Xero publishing after admin review. When enabled in Integrations, approval of an uploaded Cost or Sales document publishes it through the existing Xero mapping; it is off by default and excludes claimed expenses and native Sales invoices. Local build and route tests passed; live Xero publication is unverified. [Website](../src/App.tsx); [Xero API](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/handlers/xero.ts).
- [x] Xero connection and publishing for approved Exdox records. Availability depends on the Exdox plan and, for the one-user plan, its Xero unlock. [Website](../src/App.tsx); [Xero API](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/handlers/xero.ts).
- [ ] QuickBooks Online and Sage publishing. The Exdox website explicitly describes these as not enabled. [Website](../src/App.tsx).
- [ ] Dext-scale accounting integrations (advertised as 36+). Exdox currently has the Xero route above; breadth is a gap. [Dext integration page](https://dext.com/uk/partner/product/integrate-with-accounting-software).
- [ ] Browser extension for importing documents from supplier sites (Dextension). No equivalent was found.
- [ ] Automated missing-paperwork requests and follow-up. Exdox has human review queues but no comparable request workflow was established.
- [ ] AI Assist with core bookkeeping guidance applied to records. Exdox's support chatbot answers product questions; it is not a bookkeeping agent operating on client books. [Website](../src/chatbotKnowledge.ts).
- [ ] AI Assist with custom practice guidance. No equivalent was found.
- [x] Sales invoice creation. Exdox's regular Sales workspace creates invoices, quotes and credit notes. [Website](../src/App.tsx); [API](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/salesWorkspaceStore.ts).
- [ ] Supplier payment initiation and batched payment runs. Exdox can track reimbursement/payment status and its private Accounting pilot can record payments; neither is a customer-wide outbound payment service. [Website](../src/App.tsx).
- [ ] Payroll payments. No equivalent was found.
- [ ] Custom payment approval and security controls tied to a payment service. Exdox has document approvals and 2FA, but no outbound payment service to control.
- [ ] Automatic payment-to-ledger reconciliation. The Accounting pilot has review-led bank matching and a gated Stripe customer-invoice payment path, not Dext's outbound-payment flow. [Accounting UI](../src/AccountingReconciliation.tsx); [project context](../PROJECT.md).
- [ ] Multi-client practice dashboard with each client's deadlines and workload. Exdox workspaces are organisation-based; a firm-wide client portfolio was not found.
- [ ] Reusable practice job templates, stages, owners and deadlines. Exdox has document workflow states but no comparable practice jobs.
- [ ] Teams and locations across a practice's client list. Exdox has organisation users/roles, not the advertised practice structure.
- [ ] Advanced client management and assignment across a firm. No equivalent was found.
- [ ] Practice-wide insights and time-spent reporting. Exdox has workspace Analytics and CSV exports, not a firm-wide time/capacity view. [Website](../src/App.tsx).
- [ ] Live data-quality checks of connected Xero/QuickBooks books, including missing bills, unreconciled transactions, contact duplicates and questionable tax codes. Exdox's Data Health shows unreadable, low-confidence and duplicate Exdox uploads; it does not audit the external ledger. [Website](../src/App.tsx); [Dext Data Health](https://dext.com/uk/partner/product/ensure-client-data-health).
- [ ] Data clean-up tools that resolve problems in connected client books. Exdox can review or correct its own records, but no comparable external-ledger clean-up workflow was established.
- [ ] Client health scores, configurable scoring and improvement reports. Exdox has document quality signals but no comparable per-client score/history. [Dext Data Health](https://dext.com/uk/partner/product/ensure-client-data-health).
- [ ] Per-client activity statistics and practice-wide Data Health dashboard. Exdox's organisation Analytics is not a multi-client practice dashboard.
- [x] Workspace transaction/expense analytics and CSV export. Exdox has date-filtered Cost/Sales reporting; this does not replace Dext's MTD transaction summary or practice reports. [Website](../src/App.tsx).
- [ ] MTD for Income Tax client dashboard and HMRC quarterly submissions.
- [ ] Self-employed and landlord MTD workflow, including multiple income sources and a single licence.
- [ ] Cash and accruals basis options for MTD IT.
- [ ] Standard and calendar quarter options for MTD IT.
- [ ] Construction Industry Scheme (CIS) extraction.
- [ ] Jointly let property handling.
- [ ] MTD transaction summary report.
- [ ] Automatic imports from Shopify, Etsy, eBay, WooCommerce, Stripe and PayPal marketplaces/payment platforms. Exdox's Sales workspace does not import commerce transactions. [Dext Commerce Lite](https://dext.com/uk/partner/product/connect-to-ecommerce).
- [ ] Consolidate up to five commerce channels per client.
- [ ] Separate commerce sales, fees, refunds and payouts for accounting and reconciliation.

Exdox's private Accounting pilot has UK VAT review and an HMRC sandbox OAuth connection, but HMRC obligation retrieval and filing are disabled; that is distinct from MTD for Income Tax and must not tick any MTD item above. [Project context](../PROJECT.md); [Dext partner pricing](https://dext.com/uk/partner/pricing).

## App

- [x] Mobile camera and file capture. Exdox's Android app has camera/gallery/file submission; its web workspace shares the resulting records. [App](https://github.com/pz22pzpzai/exdox-app/blob/main/App.tsx).
- [ ] GPS mileage tracking. No GPS journey recorder was found.

## Both

- [x] Extract supplier, date, invoice number, totals, tax and currency for review. [Extraction](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/openaiExtraction.ts).
- [x] Extract receipt/invoice line items. Exdox requests and stores line items; assess Dext-level grouping separately. [Extraction](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/openaiExtraction.ts).
- [x] Duplicate receipt checks and review signals. Exdox blocks exact duplicates and highlights likely repeats; a reviewer decides ambiguous matches. [API](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/db.ts); [website](../src/App.tsx).
- [ ] AI document detection across document types at Dext's advertised breadth. Exdox classifies/extracts receipts and invoices, but broader automatic document routing was not established.
- [x] Secure document Vault. Exdox has an access-controlled Vault workspace and protected source retrieval. [Website](../src/App.tsx); [plans](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/billing.ts).
- [x] Human approval of expenses and sales documents. Exdox has admin review, rejection and approval workflows. [Website](../src/App.tsx); [plan gates](https://github.com/pz22pzpzai/exdox-server/blob/main/src/aws/shared/billing.ts).
- [x] Employee expense claims, receipts and approval. [Website](../src/App.tsx); [app](https://github.com/pz22pzpzai/exdox-app/blob/main/App.tsx).
- [x] Mileage claims with UK postcode route calculation and editable distance. This is a route estimate, not GPS tracking. [Website](../src/MileageRoutePicker.tsx); [app](https://github.com/pz22pzpzai/exdox-app/blob/main/src/services/mileageRouting.ts).
- [ ] Dext Auto Expenses equivalent. Exdox automates extraction and saved supplier defaults, but no comparable hands-off employee expense workflow was established.
- [ ] Direct employee expense payments. Exdox marks reimbursements paid and exports payment summaries; it does not send the payment. [Website](../src/App.tsx).

## Suggested order of work

1. Complete the document-to-ledger path: purchase-invoice email intake, robust split/grouping, missing-document requests and optional reviewed auto-publish.
2. Add supplier statements and bank-statement PDF extraction, then connect paperwork to bank matches and rules in the normal workspace. Keep live bank feeds gated until the commercial and UK regulatory route is documented.
3. Add QuickBooks/Sage and commerce imports, with clear per-integration tests and account mapping.
4. Build practice portfolio/workflow and external-ledger data health only if Exdox chooses to serve accountants as a distinct product audience.
5. Treat MTD for Income Tax and outbound payments as separate regulated/product programmes, not small extensions of the private Accounting pilot.

### Dext source pages reviewed

- [Partner pricing and full named feature list](https://dext.com/uk/partner/pricing)
- [Capture channels and extraction](https://dext.com/uk/partner/product/capture-bookkeeping-data)
- [Integrations](https://dext.com/uk/partner/product/integrate-with-accounting-software)
- [Data Health](https://dext.com/uk/partner/product/ensure-client-data-health)
- [Practice workflows](https://dext.com/uk/partner/product/improve-workflows)
- [Practice productivity](https://dext.com/uk/partner/product/practice-productivity)
- [Payments](https://dext.com/uk/partner/product/dext-payments)
- [Commerce Lite](https://dext.com/uk/partner/product/connect-to-ecommerce)
