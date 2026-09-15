export type ChatbotKnowledgeEntry = {
  id: number;
  question: string;
  answer: string;
};

export const workspaceChatbotKnowledge: ChatbotKnowledgeEntry[] = [
  { id: 1, question: "How do I upload a purchase receipt?", answer: "Select Upload Costs in the dashboard header, choose the receipt or invoice files, and wait for Exdox to process them. The documents will appear in Costs Inbox." },
  { id: 2, question: "How do I upload a sales invoice?", answer: "Select Upload Sales in the header and choose the relevant files. Uploaded sales documents are kept in Sales Inbox, separate from business costs." },
  { id: 3, question: "Where can I see documents that need checking?", answer: "Select the action counter in the dashboard header or open Attention. It collects costs, sales, claims, and other records that require action." },
  { id: 4, question: "What does Processing mean?", answer: "Exdox is still reading or preparing the uploaded document. Allow it to finish before reviewing the extracted information." },
  { id: 5, question: "What does Review mean?", answer: "The document is ready for you to check. Open it, compare the extracted information with the original evidence, correct any mistakes, and save it." },
  { id: 6, question: "What does Ready mean?", answer: "The document has passed review and is ready for its next step, such as reimbursement, export, publishing, or accounting handoff." },
  { id: 7, question: "What does Published mean?", answer: "The record has been handed off or published, such as being sent to a connected accounting platform. It remains in Exdox as part of the audit history." },
  { id: 8, question: "What does Payment processing mean?", answer: "A personal-spend cost has been included in a reimbursement payment summary, but the payment has not yet been confirmed as completed." },
  { id: 9, question: "What does Paid mean?", answer: "The reimbursement or related financial record has been confirmed as paid and has completed its Exdox payment workflow." },
  { id: 10, question: "How do I review a Cost?", answer: "Open Costs Inbox, select the relevant row, compare the receipt with the displayed fields, correct anything inaccurate, save the changes, and then use the appropriate approval action." },
  { id: 11, question: "What should I check when reviewing a receipt?", answer: "Check the supplier, receipt date, category, payment method, currency, subtotal, VAT, total, owner, and any company-card information against the original receipt." },
  { id: 12, question: "How do I correct information Exdox extracted incorrectly?", answer: "Open the document, change the editable field, and select Save Changes. Review all related totals before approving the record." },
  { id: 13, question: "How do I find a particular Cost?", answer: "Use the search and filter controls in Costs Inbox. You can narrow the list by status, category, employee, source, or date." },
  { id: 14, question: "How do I find a particular Sale?", answer: "Open Sales Inbox and use its search, status, category, customer, owner, source, and date filters." },
  { id: 15, question: "How do I clear filters that are hiding my documents?", answer: "Select the page's Clear filters action. This restores the normal list and removes the active filters from the page address." },
  { id: 16, question: "Why can't I see a document I uploaded?", answer: "Check that you are in the correct workspace, such as Costs rather than Sales, and clear any filters. Also check Processing, Archive, and Recycle Bin where applicable." },
  { id: 17, question: "How do I create an expense claim?", answer: "Select Create claim, enter the claim details, choose your eligible personal-spend purchases, check the total, and submit the claim." },
  { id: 18, question: "Why is a receipt unavailable when creating a claim?", answer: "It may not be classified as personal spending, may still need review, may already belong to another active claim, or may not belong to your account." },
  { id: 19, question: "How do I create a mileage claim?", answer: "Select Create mileage claim, enter the journey postcodes, mileage, requested rate, and description, add any required evidence, check the total, and submit it." },
  { id: 20, question: "Where does a mileage claim go after submission?", answer: "It enters the normal approval workflow. For business administrators, it appears in the Costs workflow as a structured mileage Cost." },
  { id: 21, question: "How do I approve an expense claim?", answer: "Open Expense Claims, select the pending claim, check its details and every attached receipt or mileage proof, and then select the available approval action." },
  { id: 22, question: "Can I change an approved claim?", answer: "Approved, paid, or rejected claims may have their important fields locked to preserve the audit history. Any available actions will be shown on the claim page." },
  { id: 23, question: "How do employee reimbursements work?", answer: "Approved personal-spend Costs can be included in a reimbursement payment summary. After the actual payment is made, an administrator confirms those payments as paid in Exdox." },
  { id: 24, question: "Does downloading a reimbursement summary mark everything as paid?", answer: "No. Downloading the summary records that payment preparation has started. The administrator must separately confirm when the money has actually been paid." },
  { id: 25, question: "How do I mark reimbursements as paid?", answer: "Open the filtered payment list using the header payment alert, check the included items, and use Mark payment(s) as paid only after the real payment has been completed." },
  { id: 26, question: "How do I create a customer invoice in Exdox?", answer: "Open the Sales management area, choose the invoice document type, select or create a customer, add the invoice lines and VAT, save the draft, and issue it when correct." },
  { id: 27, question: "Can I create quotes and credit notes?", answer: "Yes. The Sales management area supports invoices, quotes, and credit notes with customers, multiple lines, VAT, generated PDFs, and workflow tracking." },
  { id: 28, question: "How do I turn a quote into an invoice?", answer: "Open the issued quote and use the available conversion action. Check the resulting invoice details before issuing it." },
  { id: 29, question: "How do I record a partial customer payment?", answer: "Open the relevant native sales document and use the payment action to enter the amount received. Exdox will update the outstanding balance." },
  { id: 30, question: "How do I add or edit a customer?", answer: "Open Sales Customers, create a customer or select an existing one, update the relevant contact and billing information, and save it." },
  { id: 31, question: "Can I import a customer list?", answer: "Yes. Use the customer CSV import option in Sales Customers and check the imported records before using them on sales documents." },
  { id: 32, question: "What is my private Sales submission address?", answer: "It is a private address displayed in Sales Submissions that can receive forwarded sales-document attachments when email forwarding has been configured." },
  { id: 33, question: "What is the Document Vault for?", answer: "Vault stores supporting business files that need secure retention and retrieval but should not be treated as Costs or Sales." },
  { id: 34, question: "Why is Vault locked?", answer: "Vault access depends on the organisation's plan. The workspace owner can open Billing to review plans that include Vault." },
  { id: 35, question: "How do Supplier Rules work?", answer: "Supplier Rules apply saved defaults to matching purchase documents, such as category, VAT treatment, and payment method. Unusual documents should still be reviewed." },
  { id: 36, question: "How do Customer Rules work?", answer: "Customer Rules apply saved defaults to matching sales documents. Use specific customer text so unrelated records are not matched accidentally." },
  { id: 37, question: "How do I create a Supplier Rule?", answer: "Open Supplier Rules, enter dependable supplier matching text, choose the normal category, VAT rate, and payment method, set the rule as active, and save it." },
  { id: 38, question: "Can a rule replace document review completely?", answer: "No. Rules reduce repetitive data entry, but you should still review unfamiliar documents, unusual values, and anything Exdox flags for attention." },
  { id: 39, question: "How do Company Cards work?", answer: "Add safe card references using a label and the final four digits. Exdox uses them to distinguish company-card purchases from personal spending that may require reimbursement." },
  { id: 40, question: "Does Exdox store full company-card numbers?", answer: "No. Exdox does not request or store the full card number, security code, or banking credentials on the Company Cards page." },
  { id: 41, question: "What is a company-card employee exception?", answer: "It handles the rare case where an employee's personal card has the same final four digits as a registered company card, preventing incorrect classification." },
  { id: 42, question: "What does Workspace Health show?", answer: "It shows unreadable uploads, processing records, review work, missing information, claim progress, workflow completion, and other record-quality indicators." },
  { id: 43, question: "What is the Workflows page for?", answer: "Workflows shows how documents enter Exdox and move through processing, review, approval, publishing, and completion." },
  { id: 44, question: "What information appears in Analytics?", answer: "Analytics uses paid Costs and paid Sales to provide totals, category reporting, forecasts, cashflow information, an itemised ledger, and CSV exports." },
  { id: 45, question: "How do I create a custom Analytics period?", answer: "Choose Custom date range, enter the inclusive start and end dates, and apply the range. The entire Analytics page and its exports will follow those dates." },
  { id: 46, question: "How do I connect Exdox to Xero?", answer: "Open Integrations, select Connect Xero, sign in to Xero, authorise the required organisation, return to Exdox, and configure the accounting mappings." },
  { id: 47, question: "Why is the Xero connection unavailable during my trial?", answer: "Accounting integrations require an active subscription or the available trial accounting-access unlock. The Integrations and Billing pages will show the applicable option." },
  { id: 48, question: "Does approving a Cost automatically publish it to Xero?", answer: "No. Approval and Xero publishing are separate actions. Check the approved record and select Publish to Xero when you are ready to send it." },
  { id: 49, question: "How do I invite an employee or manager?", answer: "Open Profile/Settings, find Team & access, enter the person's details, select the correct role and department, and send the invitation." },
  { id: 50, question: "How do I recover something I deleted?", answer: "Open Recycle Bin, find the deleted document or claim, check its remaining recovery time, and select Restore. Items are permanently removed after the displayed retention period." },
  { id: 51, question: "How do I switch between organisations?", answer: "Use the organisation selector in the dashboard header. Exdox will load the records, settings, and permissions belonging to the selected organisation." },
  { id: 52, question: "Why can't I see the organisation selector?", answer: "Organisation switching is available only when your account belongs to more than one accessible organisation and your role permits the relevant business workspace." },
  { id: 53, question: "What does the number in the header action button mean?", answer: "It totals the current documents, claims, Vault uploads, or other records requiring attention. Select it to see a breakdown." },
  { id: 54, question: "Why does the header say No actions needed?", answer: "Exdox has not found any current review or approval work requiring your account. You can still open individual workspaces and browse completed records." },
  { id: 55, question: "How do I return to the main dashboard?", answer: "Select Overview in the navigation or select the Exdox logo at the top of the workspace navigation." },
  { id: 56, question: "How do I open a document from a list?", answer: "Select the document's row or displayed name. Exdox will open the appropriate Cost, Sale, Vault, or personal document page." },
  { id: 57, question: "Can I search using a supplier's name?", answer: "Yes. Enter the supplier name in the Costs search field. You can combine the search with status, date, category, and employee filters." },
  { id: 58, question: "Can I search Sales by customer name?", answer: "Yes. Use the search field or customer filter in Sales Inbox to narrow the list to that customer's records." },
  { id: 59, question: "How do I show only documents needing review?", answer: "Open the relevant inbox and choose Needs review from the issue or status filtering options." },
  { id: 60, question: "How do I show only completed records?", answer: "Choose a completed status such as Paid or Published, depending on the workspace and workflow you want to inspect." },
  { id: 61, question: "How do I filter documents by date?", answer: "Enter the start and end dates in the page's date controls. The results and page exports will follow the selected inclusive period." },
  { id: 62, question: "Why are there no results after applying a date filter?", answer: "No records may fall within that period, or another filter may also be active. Clear the filters and apply the dates again." },
  { id: 63, question: "How do I sort a document list?", answer: "Use the page's sorting control to choose the available order, such as newest, oldest, highest value, or lowest value." },
  { id: 64, question: "Can I filter Costs by employee?", answer: "Business administrators can use the employee or owner filter in Costs Inbox to review documents assigned to a particular person." },
  { id: 65, question: "Can an employee see another employee's expenses?", answer: "No. Standard employees receive a personal workspace containing only their own permitted documents, claims, and reports." },
  { id: 66, question: "What can a business administrator see?", answer: "A business administrator can access organisation-level workspaces and permitted review controls. Billing and certain ownership controls may remain limited to the workspace owner." },
  { id: 67, question: "How do I upload several files together?", answer: "Select the appropriate upload button and choose multiple supported files. Exdox will create and process the resulting documents individually." },
  { id: 68, question: "What happens if I upload a multi-page PDF?", answer: "For supported Sales PDF uploads, Exdox can treat it as one document, separate each page, or automatically detect document boundaries using the selected PDF mode." },
  { id: 69, question: "How do I choose how a Sales PDF is divided?", answer: "Use the Sales PDF handling option when uploading. Choose one document, one document per page, or automatic boundary detection." },
  { id: 70, question: "What should I do if a document is unreadable?", answer: "Open it and check whether the information can be entered manually. If the evidence itself is unclear, delete or replace it with a sharper image or PDF." },
  { id: 71, question: "Why has Exdox identified a possible duplicate?", answer: "Another record may have similar supplier, date, reference, or value information. Compare both documents before deciding whether one should be removed." },
  { id: 72, question: "Does a duplicate warning automatically delete anything?", answer: "No. It asks for human review. Exdox does not remove a document merely because it resembles another record." },
  { id: 73, question: "How do I delete an incorrect document?", answer: "Open the document and select the available deletion action. Confirm the request carefully; recoverable items will move to Recycle Bin." },
  { id: 74, question: "Can an administrator delete an employee's document?", answer: "Business administrators can manage organisation documents from the website where their permissions allow it. The deletion control will appear on the relevant record." },
  { id: 75, question: "Why is the Delete button missing?", answer: "Your role, the record's ownership, its current state, or the type of record may prevent deletion. Exdox displays only actions your account can perform safely." },
  { id: 76, question: "How long does a deleted item remain recoverable?", answer: "Open Recycle Bin to see the exact deletion date and remaining recovery period for each item." },
  { id: 77, question: "Can I permanently delete one item immediately?", answer: "The normal website workflow uses the Recycle Bin and its retention period. This protects users from accidental permanent deletion." },
  { id: 78, question: "How do I download a stored receipt or document?", answer: "Open the record and select its download action. Exdox will request a protected download for the original stored evidence." },
  { id: 79, question: "Why is the document preview not appearing?", answer: "The file may still be processing, the protected preview may have expired, or the format may require downloading. Refresh the record and try its download action." },
  { id: 80, question: "How do I zoom in on a receipt?", answer: "Open the receipt preview to enter the larger viewer. You can zoom and move around the image to inspect small text." },
  { id: 81, question: "How do I view multiple mileage proof images?", answer: "Open the mileage Cost or claim and select the proof you want to inspect before opening the larger image viewer." },
  { id: 82, question: "Can I add more evidence to a mileage claim?", answer: "If the claim's current state allows it, open the claim and use the evidence upload control. Locked or completed claims may no longer accept changes." },
  { id: 83, question: "How do I change the organisation's mileage rate?", answer: "A business administrator can open Profile/Settings, find the mileage setting, enter the approved rate, and save the organisation settings." },
  { id: 84, question: "Can an employee request a different mileage rate?", answer: "The mileage form can allow the employee to enter a requested rate. The submitted rate remains visible for normal administrator review and approval." },
  { id: 85, question: "How is a mileage total calculated?", answer: "Exdox multiplies the submitted number of miles by the saved or requested mileage rate. Check both figures before submission or approval." },
  { id: 86, question: "How do I export a Costs list to CSV?", answer: "Apply the filters and date range you require, then select the page's CSV export action. The downloaded file will follow the active view." },
  { id: 87, question: "How do I export my personal expense history?", answer: "Open My Reports, choose the required filters and reporting period, and use the available CSV export control." },
  { id: 88, question: "Can I export Sales separately from Costs?", answer: "Yes. Costs and Sales have separate workspaces and exports so purchase and income records are not mixed." },
  { id: 89, question: "What is the itemised ledger in Analytics?", answer: "It is the detailed list behind the selected Analytics period. Use it to inspect the individual paid records contributing to the totals." },
  { id: 90, question: "Why is a document missing from Analytics?", answer: "Analytics uses paid records within the selected date range. A document that is still Processing, in Review, Ready, or Published without being paid may be excluded." },
  { id: 91, question: "How do I change the organisation's VAT settings?", answer: "Open Profile/Settings, update the VAT registration and default VAT options, then save the organisation settings." },
  { id: 92, question: "Can I change the VAT rate on one document?", answer: "Open the document while it is editable, choose the correct VAT treatment, verify the calculated values, and save before approval." },
  { id: 93, question: "How do I map Exdox categories to Xero accounts?", answer: "Open Integrations, load the Xero reference information, assign each Exdox Cost or Sales category to the appropriate Xero account, and save the mappings." },
  { id: 94, question: "Why are Cost and Sales VAT mappings separate?", answer: "Xero can provide tax codes that apply only to purchases or only to revenue. Separate mappings prevent an expense-only VAT code from being applied to Sales." },
  { id: 95, question: "How do I refresh information imported from Xero?", answer: "Open Integrations and use the refresh action. Exdox will reload the available accounts, tax rates, contacts, tracking information, and other reference lists." },
  { id: 96, question: "How do I select a different Xero organisation?", answer: "If more than one authorised Xero organisation is available, choose the required organisation on the Integrations page before saving mappings or publishing records." },
  { id: 97, question: "How do I disconnect Xero?", answer: "Open Integrations, review the currently connected organisation, and select the disconnect action. Confirm it before removing the connection." },
  { id: 98, question: "Will disconnecting Xero delete my Exdox records?", answer: "No. Disconnecting removes the accounting connection but does not delete the Costs, Sales, claims, or evidence already stored in Exdox." },
  { id: 99, question: "How do I change a team member's department?", answer: "Open Profile/Settings, find the team member, choose the correct department from their selector, and wait for the update confirmation." },
  { id: 100, question: "How do I remove a team member?", answer: "A permitted business administrator can open Profile/Settings, find the person under Team members, select Remove team member, and confirm. Historical business records are retained for audit continuity." },
];

const ignoredWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "can", "choose", "could", "do", "does", "exdox", "for", "from", "happens", "how", "i", "if", "in", "is", "it", "me", "mean", "means", "my", "of", "on", "or", "that", "the", "then", "there", "this", "to", "what", "when", "where", "which", "why", "will", "with", "you", "your",
]);

const wordAliases: Record<string, string> = {
  absent: "missing", add: "create", added: "create", adding: "create", bill: "invoice", bills: "invoice", cannot: "cant",
  check: "review", checking: "review", divided: "split",
  customer: "customer", customers: "customer", deleted: "delete", deleting: "delete", documents: "document", employees: "employee",
  expenses: "cost", expense: "cost", file: "document", files: "document", find: "search", five: "multiple", invoices: "invoice", link: "connect", locate: "search", managers: "manager",
  items: "item", pages: "page", purchases: "cost", purchase: "cost", receipt: "document", receipts: "document", reimbursements: "reimbursement", rules: "rule", sales: "sale", see: "view", send: "upload", several: "multiple",
  showing: "view", shown: "view", staff: "employee", submissions: "submission", team: "employee", member: "employee", members: "employee", things: "document", together: "multiple", uploaded: "upload", uploading: "upload", users: "user", viewing: "view", waiting: "need",
};

const knowledgeAliases: Record<number, string> = {
  3: "check documents waiting attention",
  46: "connect link Xero account",
  50: "restore deleted document recycle bin",
  67: "upload multiple documents together",
  69: "split PDF pages",
  76: "deleted item recoverable",
  90: "document missing absent Analytics",
  99: "change employee department",
};

function knowledgeTokens(value: string) {
  return value
    .toLowerCase()
    .replace(/can['’]t/g, "cant")
    .replace(/expense\s+claim/g, "claim")
    .replace(/company[ -]card/g, "companycard")
    .replace(/credit\s+note/g, "creditnote")
    .replace(/[^a-z0-9£]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => wordAliases[word] ?? word)
    .filter((word) => !ignoredWords.has(word));
}

function similarityScore(inputTokens: string[], questionTokens: string[]) {
  const input = new Set(inputTokens);
  const question = new Set(questionTokens);
  const shared = [...input].filter((word) => question.has(word)).length;
  if (!shared) return 0;
  const coverage = shared / Math.max(1, input.size);
  const precision = shared / Math.max(1, question.size);
  return (coverage * 0.68) + (precision * 0.32);
}

export function findWorkspaceChatbotAnswer(message: string) {
  const inputTokens = knowledgeTokens(message);
  if (!inputTokens.length) return null;
  const ranked = workspaceChatbotKnowledge
    .map((entry) => {
      const questionTokens = knowledgeTokens(entry.question);
      const aliasTokens = knowledgeAliases[entry.id] ? knowledgeTokens(knowledgeAliases[entry.id]!) : [];
      return { entry, questionTokens, score: Math.max(similarityScore(inputTokens, questionTokens), similarityScore(inputTokens, aliasTokens)) };
    })
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  const second = ranked[1];
  if (inputTokens.length === 1 && best?.questionTokens.length !== 1) return null;
  if (!best || best.score < 0.57) return null;
  if (second && best.score - second.score < 0.04 && best.score < 0.82) return null;
  return best.entry.answer;
}
