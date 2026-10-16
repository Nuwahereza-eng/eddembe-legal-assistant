export const LETTER_TYPES = {
  landlord_reply: {
    label: "Reply to a landlord",
    search: "landlord tenant notice termination eviction rent deposit",
  },
  employer_complaint: {
    label: "Complaint to an employer",
    search: "employer employee wages termination dismissal notice",
  },
  access_to_information: {
    label: "Access to Information request",
    search: "request for access to information public body information officer",
  },
} as const;

export type LetterType = keyof typeof LETTER_TYPES;

export const DISCLAIMER_LINE = "This letter was prepared with help from an AI tool and is not legal advice.";

export function letterPrompt(p: {
  letterType: LetterType;
  facts: string;
  recipient: string;
  senderName: string;
  chunks: string;
}): string {
  return `Draft a short, polite, firm letter in simple English for the person below.
Cite only the law sections given. Include date and address placeholders.
End with this line: "${DISCLAIMER_LINE}"
When the Employment (Amendment) Act, 2026 replaces a section of the Employment Act, cite it like this:
"section 70 of the Employment Act, Cap. 226, as substituted by section 20 of the Employment (Amendment) Act, 2026".

Letter type: ${LETTER_TYPES[p.letterType].label}
Facts: ${p.facts}
Recipient: ${p.recipient}
Sender: ${p.senderName}
Law sections: ${p.chunks}

Return the letter as plain text only.`;
}
